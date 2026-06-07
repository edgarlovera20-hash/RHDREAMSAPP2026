import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/** Extract Google accessToken from request body or Authorization header */
function extractGoogleToken(req: Request): string | null {
  if (req.body && req.body.accessToken) {
    return req.body.accessToken as string;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const q = (req.query as Record<string, string>).accessToken;
  if (q) return q;
  return null;
}

/** Map Google API HTTP status to our response */
async function handleGoogleResponse(res: Response, googleRes: globalThis.Response) {
  const body = await googleRes.json().catch(() => ({}));
  if (googleRes.ok) return { ok: true as const, body };
  if (googleRes.status === 401) {
    res.status(401).json({ success: false, error: "Google token expired or invalid", code: 401 });
    return { ok: false as const };
  }
  if (googleRes.status === 403) {
    const msg =
      (body as { error?: { message?: string } })?.error?.message ||
      "Forbidden — check Google API scopes/permissions";
    res.status(403).json({ success: false, error: msg, code: 403 });
    return { ok: false as const };
  }
  res.status(googleRes.status).json({
    success: false,
    error: (body as { error?: { message?: string } })?.error?.message || "Google API error",
    code: googleRes.status,
  });
  return { ok: false as const };
}

// ---------------------------------------------------------------------------
// POST /api/google/sheets/create
// ---------------------------------------------------------------------------
router.post("/sheets/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const { title, headers = [], rows = [] } = req.body as {
      title: string;
      headers?: string[];
      rows?: string[][];
    };

    // 1. Create the spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: title || "Untitled Spreadsheet" },
      }),
    });

    const result = await handleGoogleResponse(res, createRes);
    if (!result.ok) return;

    const sheetData = result.body as { spreadsheetId: string; spreadsheetUrl: string };
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // 2. Append headers + rows if provided
    const allRows = headers.length > 0 ? [headers, ...rows] : rows;
    if (allRows.length > 0) {
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: allRows }),
        }
      );
      if (!appendRes.ok) {
        const errBody = await appendRes.json().catch(() => ({}));
        return res.status(appendRes.status).json({
          success: false,
          error:
            (errBody as { error?: { message?: string } })?.error?.message ||
            "Failed to append rows",
        });
      }
    }

    return res.json({ success: true, spreadsheetId, spreadsheetUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/google/sheets/import
// ---------------------------------------------------------------------------
router.post("/sheets/import", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const { sheetId } = req.body as { sheetId: string };
    if (!sheetId) {
      return res.status(400).json({ success: false, error: "sheetId is required" });
    }

    const googleRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z1000`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    const data = result.body as { values?: string[][] };
    return res.json({ success: true, values: data.values || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/google/gmail/send
// ---------------------------------------------------------------------------
router.post("/gmail/send", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const { to, subject, body } = req.body as {
      to: string;
      subject: string;
      body: string;
    };

    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: "to, subject, and body are required" });
    }

    // Build RFC 2822 message
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ].join("\r\n");

    // base64url encode
    const encoded = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const googleRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      }
    );

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    const data = result.body as { id: string };
    return res.json({ success: true, messageId: data.id });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/google/forms/:formId
// ---------------------------------------------------------------------------
router.get("/forms/:formId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken =
      extractGoogleToken(req) || (req.query as Record<string, string>).accessToken;
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const { formId } = req.params;
    const googleRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    return res.json({ success: true, form: result.body });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/google/forms/create  (preserved from original stubs)
// ---------------------------------------------------------------------------
router.post("/forms/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const { title } = req.body as { title?: string };

    const googleRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ info: { title: title || "Untitled Form" } }),
    });

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    return res.json({ success: true, form: result.body });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/google/drive/files
// ---------------------------------------------------------------------------
router.get("/drive/files", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const q = (req.query as Record<string, string>).q || "";
    const fields = "files(id,name,mimeType,webViewLink)";
    const params = new URLSearchParams({ fields });
    if (q) params.set("q", q);

    const googleRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    const data = result.body as { files?: unknown[] };
    return res.json({ success: true, files: data.files || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/google/photos/albums
// ---------------------------------------------------------------------------
router.get("/photos/albums", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const googleRes = await fetch("https://photoslibrary.googleapis.com/v1/albums", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    return res.json({ success: true, albums: result.body });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/google/keep/notes
// ---------------------------------------------------------------------------
router.get("/keep/notes", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const googleRes = await fetch("https://keep.googleapis.com/v1/notes", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (googleRes.status === 403) {
      return res.status(403).json({
        success: false,
        error:
          "Access denied to Google Keep API. The Keep API requires the " +
          "'https://www.googleapis.com/auth/keep' scope and may need special " +
          "approval from Google. Ensure your OAuth app has this scope enabled.",
        code: 403,
      });
    }

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    return res.json({ success: true, notes: result.body });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/google/keep/notes  (preserved from original stubs)
// ---------------------------------------------------------------------------
router.post("/keep/notes", authMiddleware, async (req: Request, res: Response) => {
  try {
    const accessToken = extractGoogleToken(req);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: "accessToken is required" });
    }

    const googleRes = await fetch("https://keep.googleapis.com/v1/notes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (googleRes.status === 403) {
      return res.status(403).json({
        success: false,
        error:
          "Access denied to Google Keep API. The Keep API requires the " +
          "'https://www.googleapis.com/auth/keep' scope and may need special " +
          "approval from Google. Ensure your OAuth app has this scope enabled.",
        code: 403,
      });
    }

    const result = await handleGoogleResponse(res, googleRes);
    if (!result.ok) return;

    return res.json({ success: true, note: result.body });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export const createGoogleRoutes = (): Router => router;
