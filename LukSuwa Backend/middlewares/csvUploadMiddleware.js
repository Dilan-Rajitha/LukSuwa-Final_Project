import multer from "multer";

const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.includes("csv") ||
      file.originalname.toLowerCase().endsWith(".csv") ||
      file.mimetype === "application/vnd.ms-excel";
    if (!ok) return cb(new Error("Only CSV files are allowed"));
    cb(null, true);
  },
});
