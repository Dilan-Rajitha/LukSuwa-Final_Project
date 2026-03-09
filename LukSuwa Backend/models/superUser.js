// new add with location part 2025/12/23
import mongoose from "mongoose";

const superUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    role: { type: String, required: true, enum: ["doctor", "pharmacy"] },

    certificate_id: { type: String, required: true, unique: true, trim: true },

    // doctor
    specialization: { type: String, default: "", trim: true },

    // pharmacy
    license_id: { type: String, default: "", trim: true },

    // optional display info
    pharmacy_name: { type: String, default: "", trim: true },

    // address optional
    address: { type: String, default: "", trim: true },

    // location MUST NOT be created automatically
    // Only set it when you have coordinates (after completeProfile)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: false,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: false,
      },
      _id: false,
    },

    isProfileComplete: { type: Boolean, default: false },

    certificate_image: { type: String, required: true },
    isApproved: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

// 2dsphere index (only works when location is valid)
superUserSchema.index({ location: "2dsphere" });

const SuperUser = mongoose.model("SuperUser", superUserSchema);
export default SuperUser;
