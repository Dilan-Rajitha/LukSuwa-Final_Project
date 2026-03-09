import express from "express";
import {
    createHealthTip,
    deleteHealthTip,
    getAllHealthTips,
    getPublicHealthTips,
    toggleHealthTip,
    updateHealthTip,
} from "../controllers/healthTipController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/public", getPublicHealthTips);

// Admin (protected)
router.get("/", verifyToken, getAllHealthTips);
router.post("/", verifyToken, createHealthTip);
router.patch("/:id", verifyToken, updateHealthTip);
router.patch("/:id/toggle", verifyToken, toggleHealthTip);
router.delete("/:id", verifyToken, deleteHealthTip);

export default router;
