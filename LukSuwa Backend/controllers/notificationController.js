import Notification from "../models/Notification.js";
import PushToken from "../models/PushToken.js";

export async function registerPushToken(req, res) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const userType = req.user?.type;

    const { expoPushToken, deviceId = "", platform = "" } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!expoPushToken) return res.status(400).json({ message: "expoPushToken is required" });

    await PushToken.updateOne(
      { expoPushToken },
      {
        $set: {
          userId,
          userType,
          role,
          deviceId,
          platform,
          isActive: true,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.json({ ok: true, message: "Push token registered" });
  } catch (e) {
    return res.status(500).json({ message: "Error registering token", error: e.message });
  }
}

// unread count for current user
export async function getMyNotificationCount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const count = await Notification.countDocuments({
      targetUserIds: userId,
      status: "SENT",
    });

    return res.json({ ok: true, count });
  } catch (e) {
    console.log("getMyNotificationCount error:", e);
    return res.status(500).json({ message: "Error fetching count", error: e.message });
  }
}
