import { Router } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { generateToken } from "../middleware/auth";
import { LoginRequestSchema } from "../validators/schemas";
import { logger } from "../utils/logger";

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

  return router;
};
