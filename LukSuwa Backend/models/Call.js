import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
    },

    // Appointment bind
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "patientModel",
      required: true,
    },
    patientModel: {
      type: String,
      required: true,
      enum: ["User", "SuperUser"], 
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "doctorModel",
      required: true,
    },
    doctorModel: {
      type: String,
      required: true,
      enum: ["User", "SuperUser"], 
    },

    callType: {
      type: String,
      enum: ["video", "audio"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "ongoing", "completed", "missed", "rejected"],
      default: "pending",
    },

    startTime: { type: Date },
    endTime: { type: Date },

    duration: {
      type: Number, // seconds
      default: 0,
    },

    prescriptionIssued: {
      type: Boolean,
      default: false,
    },

    // If you're going to use TelemediPrescription, change ref to "TelemediPrescription"
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },

    chatMessages: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        senderModel: {
          type: String,
          enum: ["User", "SuperUser"],
        },

        message: {
          type: String,
          required: true,
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },

        // added "prescription" 
        type: {
          type: String,
          enum: ["text", "image", "file", "prescription"],
          default: "text",
        },

        // optional meta for prescription messages
        prescriptionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Prescription",
          required: false,
        },
        pdfUrl: {
          type: String,
          required: false,
        },
      },
    ],

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    feedback: String,

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    rejectedAt: Date,

    missedReason: String,
  },
  { timestamps: true }
);

// Indexes
callSchema.index({ patientId: 1, createdAt: -1 });
callSchema.index({ doctorId: 1, createdAt: -1 });
callSchema.index({ callId: 1 });
callSchema.index({ status: 1 });

const Call = mongoose.model("Call", callSchema);
export default Call;