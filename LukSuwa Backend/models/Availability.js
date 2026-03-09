import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "doctorModel",
    },
    doctorModel: {
      type: String,
      required: true,
      enum: ["User", "SuperUser"],
    },

    // slots list (week ahead)
    slots: { type: [slotSchema], default: [] },
  },
  { timestamps: true }
);

availabilitySchema.index({ doctorId: 1 });

export default mongoose.model("Availability", availabilitySchema);
