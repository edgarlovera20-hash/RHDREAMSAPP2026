import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const NOT_CONFIGURED = {
  success: false,
  error: "Google API not configured — set GOOGLE_ACCESS_TOKEN in .env",
};

export const createGoogleRoutes = (): Router => {
  const router = Router();

  // POST /api/google/sheets/create
  router.post("/sheets/create", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // POST /api/google/sheets/import
  router.post("/sheets/import", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // POST /api/google/gmail/send
  router.post("/gmail/send", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // GET /api/google/forms/:formId
  router.get("/forms/:formId", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // POST /api/google/forms/create
  router.post("/forms/create", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // GET /api/google/drive/files
  router.get("/drive/files", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // GET /api/google/keep/notes
  router.get("/keep/notes", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // POST /api/google/keep/notes
  router.post("/keep/notes", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  // GET /api/google/photos/albums
  router.get("/photos/albums", authMiddleware, (_req, res) => {
    res.status(501).json(NOT_CONFIGURED);
  });

  return router;
};
