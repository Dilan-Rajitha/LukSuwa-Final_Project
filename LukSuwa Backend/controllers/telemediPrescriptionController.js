import Call from "../models/Call.js";
import TelemediPrescription from "../models/TelemediPrescription.js";
import { generateTelemediPrescriptionPdf } from "../services/TelemediPrescriptionPdf.js";

export const createTelemediPrescription = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      callId,
      patientName,
      age,
      doctorName,
      date,
      medicines = [],
    } = req.body;

    if (!callId || !patientName || !age || !doctorName || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    // Only doctor can create (recommended)
    if (call.doctorId.toString() !== userId) {
      return res.status(403).json({ message: "Only doctor can create prescription" });
    }

    const prescription = await TelemediPrescription.create({
      callId,
      appointmentId: call.appointmentId,
      doctorId: call.doctorId,
      patientId: call.patientId,
      patientName,
      age,
      doctorName,
      date: new Date(date),
      medicines,
    });

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get("host")}`;

    const { pdfUrl } = await generateTelemediPrescriptionPdf({
      prescription,
      baseUrl,
    });

    prescription.pdfUrl = pdfUrl;
    await prescription.save();

    // Also link to Call (you already have linkPrescription flow, but we keep safe)
    call.prescriptionIssued = true;
    call.prescriptionId = prescription._id;
    await call.save();

    return res.status(201).json({
      message: "Prescription created",
      prescriptionId: prescription._id,
      pdfUrl,
    });
  } catch (error) {
    console.error("createTelemediPrescription error:", error);
    return res.status(500).json({ message: "Error creating prescription", error: error.message });
  }
};

// Optional: fetch prescription by id (for future UI)
export const getTelemediPrescription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const prescription = await TelemediPrescription.findById(id);
    if (!prescription) return res.status(404).json({ message: "Not found" });

    // Ensure user belongs to that call
    const call = await Call.findOne({ callId: prescription.callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    if (call.patientId.toString() !== userId && call.doctorId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    return res.json({ prescription });
  } catch (error) {
    console.error("getTelemediPrescription error:", error);
    return res.status(500).json({ message: "Error", error: error.message });
  }
};