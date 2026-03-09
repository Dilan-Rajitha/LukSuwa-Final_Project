import mongoose from "mongoose";

const medSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const telemediPrescriptionSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, index: true }, // matches Call.callId (uuid)
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },

    doctorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, required: true },

    patientName: { type: String, required: true, trim: true },
    age: { type: String, required: true, trim: true },

    doctorName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },

    medicines: { type: [medSchema], default: [] },

    pdfUrl: { type: String }, // saved after pdf gen
  },
  { timestamps: true }
);

export default mongoose.model("TelemediPrescription", telemediPrescriptionSchema);