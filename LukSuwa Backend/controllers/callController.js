import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Appointment from "../models/Appointment.js";
import Call from "../models/Call.js";
import { generateAgoraRtcToken } from "../services/agoraTokenService.js";

// Helper function to find user
const findUserById = async (userId) => {
  try {
    const User = mongoose.model("User");
    let user = await User.findById(userId);

    if (user) {
      return { user, model: "User" };
    }

    const SuperUser = mongoose.model("SuperUser");
    user = await SuperUser.findById(userId);

    if (user) {
      return { user, model: "SuperUser" };
    }

    return null;
  } catch (error) {
    console.error("Error finding user:", error);
    return null;
  }
};

// Appointment gate helper
const assertAppointmentAccess = async (call) => {
  if (!call?.appointmentId) {
    return { ok: false, message: "Call has no appointmentId bound" };
  }

  const appt = await Appointment.findById(call.appointmentId);
  if (!appt) return { ok: false, message: "Appointment not found" };
  if (appt.status !== "confirmed") {
    return { ok: false, message: "Appointment not confirmed" };
  }

  const now = new Date();
  const start = new Date(appt.startTime);
  const end = new Date(appt.endTime);

  const GRACE_MIN = 10;
  const startWithGrace = new Date(start.getTime() - GRACE_MIN * 60 * 1000);

  if (now < startWithGrace || now > end) {
    return { ok: false, message: "Chat allowed only during appointment time" };
  }

  return { ok: true };
};

// Initiate a call 
export const initiateCall = async (req, res) => {
  try {
    const { doctorId, callType, appointmentId } = req.body;
    const patientId = req.user.id;

    if (!doctorId || !callType || !appointmentId) {
      return res.status(400).json({
        message: "doctorId, callType, appointmentId are required",
      });
    }

    if (!patientId) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    if (!["video", "audio"].includes(callType)) {
      return res.status(400).json({
        message: "Invalid call type. Must be 'video' or 'audio'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patient ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointmentId format" });
    }

    // appointment check
    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    // must match patient & doctor
    if (appt.patientId.toString() !== patientId) {
      return res.status(403).json({ message: "This appointment is not yours" });
    }
    if (appt.doctorId.toString() !== doctorId) {
      return res.status(400).json({ message: "Doctor mismatch with appointment" });
    }

    if (appt.status !== "confirmed") {
      return res.status(400).json({ message: "Appointment not confirmed yet" });
    }

    // time window gate
    const now = new Date();
    const start = new Date(appt.startTime);
    const end = new Date(appt.endTime);

    const GRACE_MIN = 10;
    const startWithGrace = new Date(start.getTime() - GRACE_MIN * 60 * 1000);

    if (now < startWithGrace || now > end) {
      return res.status(400).json({
        message: "Call allowed only during appointment time",
        allowedFrom: startWithGrace,
        allowedUntil: end,
      });
    }

    // Find patient in database
    const patientResult = await findUserById(patientId);
    if (!patientResult) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find doctor in database
    const doctorResult = await findUserById(doctorId);
    if (!doctorResult) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const { user: doctor, model: doctorModel } = doctorResult;
    const { model: patientModel } = patientResult;

    // Check role
    const doctorRoles = ["doctor", "pharmacy", "superuser"];
    if (!doctorRoles.includes(doctor.role?.toLowerCase())) {
      return res.status(400).json({
        message: "Selected user is not authorized for consultations",
        userRole: doctor.role,
      });
    }

    // Generate unique call ID
    const callId = uuidv4();

    const newCall = new Call({
      callId,
      appointmentId,
      patientId,
      patientModel,
      doctorId,
      doctorModel,
      callType,
      status: "pending",
    });

    await newCall.save();

    await newCall.populate("patientId", "firstName lastName email username role type");
    await newCall.populate("doctorId", "firstName lastName email username role type");
    await newCall.populate("appointmentId");

    return res.status(201).json({
      message: "Call initiated successfully",
      call: newCall,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return res.status(500).json({
      message: "Error initiating call",
      error: error.message,
    });
  }
};

// Accept call
export const acceptCall = async (req, res) => {
  try {
    const { callId } = req.body;
    const doctorId = req.user.id;

    if (!callId) return res.status(400).json({ message: "Call ID is required" });

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Unauthorized to accept this call" });
    }

    if (call.status !== "pending") {
      return res.status(400).json({
        message: `Cannot accept call. Current status: ${call.status}`,
      });
    }

    call.status = "ongoing";
    call.startTime = new Date();
    await call.save();

    await call.populate("patientId", "firstName lastName email username");
    await call.populate("doctorId", "firstName lastName email username");

    res.json({ message: "Call accepted successfully", call });
  } catch (error) {
    console.error("Error accepting call:", error);
    res.status(500).json({ message: "Error accepting call", error: error.message });
  }
};

// Reject call
export const rejectCall = async (req, res) => {
  try {
    const { callId, reason } = req.body;
    const userId = req.user.id;

    if (!callId) return res.status(400).json({ message: "Call ID is required" });

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.patientId.toString() !== userId && call.doctorId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to reject this call" });
    }

    if (call.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject call. Current status: ${call.status}`,
      });
    }

    call.status = "rejected";
    call.rejectedBy = userId;
    call.rejectedAt = new Date();
    if (reason) call.missedReason = reason;

    await call.save();

    res.json({ message: "Call rejected successfully", call });
  } catch (error) {
    console.error("Error rejecting call:", error);
    res.status(500).json({ message: "Error rejecting call", error: error.message });
  }
};

// End call
export const endCall = async (req, res) => {
  try {
    const { callId } = req.body;
    const userId = req.user.id;

    if (!callId) return res.status(400).json({ message: "Call ID is required" });

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.patientId.toString() !== userId && call.doctorId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to end this call" });
    }

    if (call.status !== "ongoing") {
      return res.status(400).json({
        message: `Cannot end call. Current status: ${call.status}`,
      });
    }

    call.status = "completed";
    call.endTime = new Date();

    if (call.startTime) {
      call.duration = Math.floor((call.endTime - call.startTime) / 1000);
    }

    await call.save();

    await call.populate("patientId", "firstName lastName email username");
    await call.populate("doctorId", "firstName lastName email username");

    res.json({ message: "Call ended successfully", call });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ message: "Error ending call", error: error.message });
  }
};

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, page = 1 } = req.query;

    const query = {
      $or: [{ patientId: userId }, { doctorId: userId }],
    };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const calls = await Call.find(query)
      .populate("patientId", "firstName lastName email username")
      .populate("doctorId", "firstName lastName email username")
      .populate("prescriptionId")
      .populate("appointmentId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Call.countDocuments(query);

    res.json({
      message: "Call history fetched successfully",
      calls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).json({ message: "Error fetching call history", error: error.message });
  }
};

// Get single call details
export const getCallDetails = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findOne({ callId })
      .populate("patientId", "firstName lastName email username")
      .populate("doctorId", "firstName lastName email username")
      .populate("prescriptionId")
      .populate("appointmentId");

    if (!call) return res.status(404).json({ message: "Call not found" });

    if (call.patientId._id.toString() !== userId && call.doctorId._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to view this call" });
    }

    res.json({ message: "Call details fetched successfully", call });
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({ message: "Error fetching call details", error: error.message });
  }
};

// Save chat message
export const saveChatMessage = async (req, res) => {
  try {
    const { callId, message, type, prescriptionId, pdfUrl } = req.body;
    const senderId = req.user.id;

    if (!callId || !message) {
      return res.status(400).json({ message: "Call ID and message are required" });
    }

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.patientId.toString() !== senderId && call.doctorId.toString() !== senderId) {
      return res.status(403).json({ message: "Unauthorized to send message in this call" });
    }

    const senderResult = await findUserById(senderId);
    const senderModel = senderResult ? senderResult.model : "User";

    call.chatMessages.push({
      senderId,
      senderModel,
      message,
      type: type || "text",
      timestamp: new Date(),
      prescriptionId: prescriptionId || undefined,
      pdfUrl: pdfUrl || undefined,
    });

    await call.save();

    const lastMessage = call.chatMessages[call.chatMessages.length - 1];

    res.json({ message: "Message saved successfully", chatMessage: lastMessage });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ message: "Error saving message", error: error.message });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.patientId.toString() !== userId && call.doctorId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to view messages" });
    }

    res.json({ message: "Chat messages fetched successfully", chatMessages: call.chatMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
};

// Link prescription
export const linkPrescription = async (req, res) => {
  try {
    const { callId, prescriptionId } = req.body;
    const doctorId = req.user.id;

    if (!callId || !prescriptionId) {
      return res.status(400).json({ message: "Call ID and Prescription ID are required" });
    }

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    const gate = await assertAppointmentAccess(call);
    if (!gate.ok) return res.status(400).json({ message: gate.message });

    if (call.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Unauthorized - Only the doctor can link prescription" });
    }

    call.prescriptionIssued = true;
    call.prescriptionId = prescriptionId;
    await call.save();

    await call.populate("prescriptionId");

    res.json({ message: "Prescription linked successfully", call });
  } catch (error) {
    console.error("Error linking prescription:", error);
    res.status(500).json({ message: "Error linking prescription", error: error.message });
  }
};

// Rate call
export const rateCall = async (req, res) => {
  try {
    const { callId, rating, feedback } = req.body;
    const userId = req.user.id;

    if (!callId || !rating) {
      return res.status(400).json({ message: "Call ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    if (call.patientId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized - Only patient can rate the call" });
    }

    if (call.status !== "completed") {
      return res.status(400).json({ message: "Can only rate completed calls" });
    }

    call.rating = rating;
    if (feedback) call.feedback = feedback;
    await call.save();

    res.json({ message: "Call rated successfully", call });
  } catch (error) {
    console.error("Error rating call:", error);
    res.status(500).json({ message: "Error rating call", error: error.message });
  }
};

// Get call statistics
export const getCallStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Call.aggregate([
      {
        $match: {
          $or: [
            { patientId: new mongoose.Types.ObjectId(userId) },
            { doctorId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]);

    const totalCalls = await Call.countDocuments({
      $or: [{ patientId: userId }, { doctorId: userId }],
    });

    res.json({ message: "Statistics fetched successfully", totalCalls, statistics: stats });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Error fetching statistics", error: error.message });
  }
};

// Generate Agora token 
export const getAgoraToken = async (req, res) => {
  try {
    const { callId, channelName, role } = req.body;

    if (!callId && !channelName) {
      return res.status(400).json({ message: "callId or channelName is required" });
    }

    let finalChannelName = channelName;

    if (callId) {
      const call = await Call.findOne({ callId });
      if (!call) return res.status(404).json({ message: "Call not found" });

      const gate = await assertAppointmentAccess(call);
      if (!gate.ok) return res.status(400).json({ message: gate.message });

      const userId = req.user.id;
      if (call.patientId.toString() !== userId && call.doctorId.toString() !== userId) {
        return res.status(403).json({ message: "Unauthorized to get token for this call" });
      }

      finalChannelName = `luksuwa_${call.callId}`;
    }

    const uid = Math.abs(
      Array.from(req.user.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    );

    const token = generateAgoraRtcToken({
      channelName: finalChannelName,
      uid,
      role: role || "publisher",
      expireSeconds: 3600,
    });

    return res.json({
      message: "Agora token generated",
      appId: process.env.AGORA_APP_ID,
      token,
      channelName: finalChannelName,
      uid,
    });
  } catch (error) {
    console.error("Error generating Agora token:", error);
    return res.status(500).json({ message: "Error generating Agora token", error: error.message });
  }
};