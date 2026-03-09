import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "patientModel",
    },
    patientModel: {
      type: String,
      required: true,
      enum: ["User", "SuperUser"],
    },

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

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled", "completed"],
      default: "pending",
    },

    confirmedAt: Date,
    rejectedAt: Date,
    rejectReason: String,

    // optional: lock to availability slot
    availabilitySlotStart: Date,
    availabilitySlotEnd: Date,
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });

export default mongoose.model("Appointment", appointmentSchema);
