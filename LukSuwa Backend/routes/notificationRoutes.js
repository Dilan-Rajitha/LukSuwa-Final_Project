import express from "express";
import {
    getMyNotificationCount, // new add 
    registerPushToken,
} from "../controllers/notificationController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

import {
    getMyNotifications,
    getUnreadCount,
    markAllRead,
    markNotificationRead,
} from "../controllers/notificationFeedController.js";

const router = express.Router();

// push token
router.post("/register", verifyToken, registerPushToken);

// in-app notifications feed
router.get("/mine", verifyToken, getMyNotifications);
router.get("/unread-count", verifyToken, getUnreadCount);
router.patch("/:id/read", verifyToken, markNotificationRead);
router.post("/read-all", verifyToken, markAllRead);

router.get("/count", verifyToken, getMyNotificationCount); 

export default router;
