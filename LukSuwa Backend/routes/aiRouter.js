
import axios from "axios";
import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js"; // ✅ import

const router = express.Router();

// Protected chatbot route
router.post("/chatbot/message", verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Forward request to external API
        const response = await axios.post(
            "https://luk-suwa-chatbot-with-medicinalsear.vercel.app/chatbot/message",
            { message },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Chatbot API error:", err.message);
        res.status(500).json({ error: "Failed to fetch chatbot response" });
    }
});

// Protected medicine search route
router.post("/medicine/uses", verifyToken, async (req, res) => {
    try {
        const { name, strength } = req.body;
        if (!name || !strength) {
            return res.status(400).json({ error: "Medicine name and strength are required" });
        }

        const response = await axios.post(
            "https://luk-suwa-chatbot-with-medicinalsear.vercel.app/medicine/uses",
            { name, strength },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Medicine API error:", err.message);
        res.status(500).json({ error: "Failed to fetch medicine info" });
    }
});

export default router;
