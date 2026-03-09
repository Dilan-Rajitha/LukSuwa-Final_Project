import mongoose from "mongoose";

const PushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userType: { type: String, enum: ["User", "SuperUser"], required: true },

    role: { type: String, required: true, index: true }, // patient/doctor/pharmacy/admin

    expoPushToken: { type: String, required: true, unique: true },
    deviceId: { type: String, default: "" },
    platform: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("PushToken", PushTokenSchema);
