import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import Prescription from "../models/prescriptionModel.js";

const router = express.Router();


router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const records = await Prescription.find({ user: userId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: records.length,
      prescriptions: records
    });

  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await Prescription.findOne({ _id: id, user: userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found or unauthorized"
      });
    }

    await Prescription.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: "Prescription deleted successfully"
    });

  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/search", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.query;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'name' is required"
      });
    }

    const results = await Prescription.find({
      user: userId,
      medicineName: { $regex: name, $options: "i" } // case-insensitive search
    });

    return res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
