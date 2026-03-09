import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { processImage } from '../controllers/ocrController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import Prescription from "../models/prescriptionModel.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|bmp|webp/;
  const extOK = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOK = allowed.test(file.mimetype);

  if (extOK && mimeOK) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});


const saveToDB = async (userId, medications) => {
  try {
    const savedList = [];

    for (const med of medications) {
      const entry = new Prescription({
        user: userId,
        medicineName: med.name || "Unknown",
        strength: med.dosage || "N/A",   // auto-fill
        dosage: med.dosage || "N/A",     // auto-fill
        frequency: med.frequency || "N/A" // auto-fill
      });

      const saved = await entry.save();
      savedList.push(saved);
    }

    return savedList;

  } catch (error) {
    console.error("DB Save Error:", error);
    return [];
  }
};


router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file uploaded"
      });
    }

    console.log("File received:", req.file.filename);
    const imagePath = req.file.path;

    // Step 1: OCR + LLM parsing
    const result = await processImage(imagePath);

    const medications = result.medications || [];
    const userId = req.user.id;

    // Step 2: Auto-save to MongoDB
    let savedRecords = [];
    if (medications.length > 0) {
      savedRecords = await saveToDB(userId, medications);
    }

    // Step 3: Delete temp uploaded file
    try {
      fs.unlinkSync(imagePath);
      console.log("🗑️ Temp file removed:", imagePath);
    } catch (err) {
      console.warn("⚠️ Failed to delete temp file:", err.message);
    }

    // Step 4: Return output
    return res.json({
      success: true,
      message: "OCR processed & saved successfully",
      rawText: result.rawText,
      patientInfo: result.patientInfo,
      medications: medications,
      savedToDB: savedRecords
    });

  } catch (error) {
    console.error("OCR Upload Error:", error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn("Cleanup failed:", e.message);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process image"
    });
  }
});

// HEALTH CHECK
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "OCR service running",
    timestamp: new Date().toISOString()
  });
});

export default router;
