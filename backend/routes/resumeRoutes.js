const express = require("express");
const multer = require("multer");
const {
  parseResume,
  chat,
  generateLatexResume,
  enhance,
} = require("../controllers/resumeController");

const router = express.Router();

// Multer memory storage for PDF upload (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// API Routes
router.post("/parse-resume", upload.single("file"), parseResume);
router.post("/chat", chat);
router.post("/generate-latex", generateLatexResume);
router.post("/enhance", enhance);

module.exports = router;
