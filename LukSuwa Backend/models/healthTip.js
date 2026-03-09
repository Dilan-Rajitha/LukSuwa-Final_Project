import mongoose from "mongoose";

const healthTipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },

    // optional for filtering later
    category: { type: String, default: "general", trim: true },

    // admin can activate/deactivate
    isActive: { type: Boolean, default: true },

    // who created it (admin user id)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// prevent overwrite model error on hot reload
const HealthTip = mongoose.models.HealthTip || mongoose.model("HealthTip", healthTipSchema);
export default HealthTip;
