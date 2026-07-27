const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { requireAdmin } = require("../auth");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const safe = crypto.randomUUID() + path.extname(file.originalname || ".pdf");
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Admin — sobe o PDF do relatório e recebe de volta a URL pública.
router.post("/", requireAdmin, upload.single("arquivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
});

module.exports = { router, UPLOAD_DIR };
