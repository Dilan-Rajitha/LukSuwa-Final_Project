
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "SYSTEM_EVENT" },

    title: { type: String, required: true },
    body: { type: String, required: true },

    data: { type: Object, default: {} },

    targetRoles: { type: [String], default: [] },
    targetUserIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    status: { type: String, default: "SENT" },

    // NEW (for in-app feed)
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
