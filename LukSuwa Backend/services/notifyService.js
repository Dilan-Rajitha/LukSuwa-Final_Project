import Notification from "../models/Notification.js";
import PushToken from "../models/PushToken.js";
import { sendExpoPush } from "./expoPushService.js";

export async function notifyUser({
  userId,
  title,
  body,
  data = {},
  type = "SYSTEM_EVENT",
  save = true,
}) {
  if (!userId) return { ok: false, message: "userId missing" };

  const tokens = await PushToken.find({ userId, isActive: true }).select("expoPushToken");
  const messages = tokens.map((t) => ({
    to: t.expoPushToken,
    sound: "default",
    title,
    body,
    data: { ...data, type, screen: "Notifications" },
  }));

  let pushResult = { ok: true, results: [] };
  if (messages.length) pushResult = await sendExpoPush(messages);

  if (save) {
    await Notification.create({
      type,
      title,
      body,
      data,
      targetUserIds: [userId],
      status: "SENT",
      isRead: false,
      readAt: null,
    });
  }

  return { ok: true, sent: messages.length, pushResult };
}
