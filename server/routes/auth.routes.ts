import { Router } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { generateToken } from "../middleware/auth";
import { LoginRequestSchema } from "../validators/schemas";
import { logger } from "../utils/logger";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_SCOPES = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const getAdminAccounts = () => {
  const username = process.env.RHDREAMS_ADMIN_USERNAME || "";
  const email = process.env.RHDREAMS_ADMIN_EMAIL || "";
  const passwordHash = process.env.RHDREAMS_ADMIN_PASSWORD_HASH || "";

  return [
    {
      username,
      email,
      passwordHash,
      uid: process.env.RHDREAMS_ADMIN_UID || "admin",
      displayName: process.env.RHDREAMS_ADMIN_NAME || "Administrador",
      role: process.env.RHDREAMS_ADMIN_ROLE || "Admin",
    },
  ].filter((account) => (account.username || account.email) && account.passwordHash);
};

const isPasswordValid = async (plainText: string, account: ReturnType<typeof getAdminAccounts>[number]) => {
  return bcrypt.compare(plainText, account.passwordHash);
};

export const createAuthRoutes = (): Router => {
  const router = Router();

  router.post("/login", async (req, res) => {
    try {
      const { username, password } = LoginRequestSchema.parse(req.body);
      const normalizedUsername = username.trim().toLowerCase();
      const account = getAdminAccounts().find((item) =>
        [item.username, item.email].some((value) => value && value.trim().toLowerCase() === normalizedUsername)
      );

      if (!account || !(await isPasswordValid(password, account))) {
        logger.warn("Invalid login attempt", { username: normalizedUsername, ip: req.ip });
        return res.status(401).json({
          success: false,
          error: "Usuario o contrasena incorrectos.",
          code: 401,
        });
      }

      const token = generateToken(account.uid, account.role);

      res.cookie("rhdreams_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            uid: account.uid,
            email: account.email || account.username,
            displayName: account.displayName,
            role: account.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: "Datos invalidos",
          code: 400,
          details: error.issues,
        });
      }

      logger.error("Login endpoint failed", error);
      res.status(500).json({
        success: false,
        error: "No se pudo iniciar sesion.",
        code: 500,
      });
    }
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie("rhdreams_token", { path: "/" });
    res.json({ success: true });
  });

  // GET /api/auth/google — inicia flujo OAuth de Google
  router.get("/google", (_req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://rh.heavenlydreams.com.mx/api/auth/google/callback";
    if (!clientId) {
      return res.status(500).json({ success: false, error: "Google OAuth no configurado" });
    }
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    res.redirect(url.toString());
  });

  // GET /api/auth/google/callback — recibe código y obtiene tokens
  router.get("/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query as Record<string, string>;
      if (error) {
        logger.warn("Google OAuth denied", { error });
        return res.redirect("/?google_error=" + encodeURIComponent(error));
      }
      if (!code) return res.status(400).json({ success: false, error: "No se recibió código de Google" });

      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

      // Intercambiar código por tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; error?: string };
      if (tokens.error || !tokens.access_token) {
        logger.error("Google token exchange failed", tokens);
        return res.redirect("/?google_error=token_failed");
      }

      // Obtener info del usuario
      const userRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const userInfo = await userRes.json() as { email?: string; name?: string };

      logger.info("Google OAuth success", { email: userInfo.email });

      // Redirigir al frontend con tokens en query params (el frontend los guarda en localStorage)
      const params = new URLSearchParams({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || "",
        google_email: userInfo.email || "",
        google_name: userInfo.name || "",
      });
      res.redirect(`/settings?${params.toString()}`);
    } catch (err) {
      logger.error("Google OAuth callback error", err);
      res.redirect("/?google_error=server_error");
    }
  });

  // ─── Microsoft OAuth ────────────────────────────────────────────────────────
  const MS_AUTH_BASE = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0`;
  const MS_SCOPES = [
    "openid", "email", "profile", "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
    "Mail.Send",
    "Files.ReadWrite",
    "Teams.ReadBasic.All",
  ].join(" ");

  // GET /api/auth/microsoft — inicia flujo OAuth de Microsoft
  router.get("/microsoft", (_req, res) => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "https://rh.heavenlydreams.com.mx/api/auth/microsoft/callback";
    if (!clientId) {
      return res.status(500).json({ success: false, error: "Microsoft OAuth no configurado. Agrega MICROSOFT_CLIENT_ID al entorno." });
    }
    const url = new URL(`${MS_AUTH_BASE}/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", MS_SCOPES);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("prompt", "consent");
    res.redirect(url.toString());
  });

  // GET /api/auth/microsoft/callback — recibe código y obtiene tokens
  router.get("/microsoft/callback", async (req, res) => {
    try {
      const { code, error, error_description } = req.query as Record<string, string>;
      if (error) {
        logger.warn("Microsoft OAuth denied", { error, error_description });
        return res.redirect("/?ms_error=" + encodeURIComponent(error_description || error));
      }
      if (!code) return res.status(400).json({ success: false, error: "No se recibió código de Microsoft" });

      const clientId = process.env.MICROSOFT_CLIENT_ID!;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "https://rh.heavenlydreams.com.mx/api/auth/microsoft/callback";

      const tokenRes = await fetch(`${MS_AUTH_BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: MS_SCOPES,
        }),
      });
      const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
      if (tokens.error || !tokens.access_token) {
        logger.error("Microsoft token exchange failed", tokens);
        return res.redirect("/?ms_error=token_failed");
      }

      // Obtener info del usuario via Graph API
      const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userRes.json() as { mail?: string; userPrincipalName?: string; displayName?: string };

      logger.info("Microsoft OAuth success", { email: userInfo.mail || userInfo.userPrincipalName });

      const params = new URLSearchParams({
        ms_access_token: tokens.access_token,
        ms_refresh_token: tokens.refresh_token || "",
        ms_email: userInfo.mail || userInfo.userPrincipalName || "",
        ms_name: userInfo.displayName || "",
      });
      res.redirect(`/microsoft?${params.toString()}`);
    } catch (err) {
      logger.error("Microsoft OAuth callback error", err);
      res.redirect("/?ms_error=server_error");
    }
  });

  return router;
};
