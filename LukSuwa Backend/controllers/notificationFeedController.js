import mongoose from "mongoose";
import Notification from "../models/Notification.js";


export async function getMyNotifications(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);

    const notifications = await Notification.find({
      targetUserIds: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ notifications });
  } catch (e) {
    return res.status(500).json({ message: "Error fetching notifications", error: e.message });
  }
}

// PATCH /api/notifications/:id/read
export async function markNotificationRead(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    // Only allow if belongs to this user
    const notif = await Notification.findOneAndUpdate(
      {
        _id: id,
        targetUserIds: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notif) return res.status(404).json({ message: "Notification not found" });

    return res.json({ ok: true, notification: notif });
  } catch (e) {
    return res.status(500).json({ message: "Error marking read", error: e.message });
  }
}

// POST /api/notifications/read-all
export async function markAllRead(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await Notification.updateMany(
      { targetUserIds: new mongoose.Types.ObjectId(userId), isRead: { $ne: true } },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.json({ ok: true, modified: result.modifiedCount || 0 });
  } catch (e) {
    return res.status(500).json({ message: "Error marking all read", error: e.message });
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const count = await Notification.countDocuments({
      targetUserIds: new mongoose.Types.ObjectId(userId),
      isRead: { $ne: true },
    });

    return res.json({ count });
  } catch (e) {
    return res.status(500).json({ message: "Error fetching unread count", error: e.message });
  }
}
