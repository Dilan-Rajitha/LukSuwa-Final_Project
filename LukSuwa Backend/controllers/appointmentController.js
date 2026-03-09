
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Availability from "../models/Availability.js";
import { notifyUser } from "../services/notifyService.js"; // ✅ NEW

const findUserById = async (id) => {
  const User = mongoose.model("User");
  const SuperUser = mongoose.model("SuperUser");

  let u = await User.findById(id);
  if (u) return { user: u, model: "User" };

  u = await SuperUser.findById(id);
  if (u) return { user: u, model: "SuperUser" };

  return null;
};

//  PATIENT create appointment (books slot atomically)
export const createAppointment = async (req, res) => {
  let bookedSlot = false;

  try {
    const patientId = req.user.id;
    const { doctorId, startTime, endTime } = req.body;

    if (!patientId) return res.status(401).json({ message: "Unauthorized" });
    if (!doctorId || !startTime || !endTime) {
      return res.status(400).json({ message: "doctorId, startTime, endTime are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid startTime/endTime" });
    }
    if (end <= start) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    // find models
    const p = await findUserById(patientId);
    if (!p) return res.status(404).json({ message: "Patient not found" });

    const d = await findUserById(doctorId);
    if (!d) return res.status(404).json({ message: "Doctor not found" });

    //  atomic book slot (only if still free)
    const booked = await Availability.findOneAndUpdate(
      {
        doctorId,
        "slots.start": start,
        "slots.end": end,
        "slots.isBooked": false,
      },
      { $set: { "slots.$.isBooked": true } },
      { new: true }
    );

    if (!booked) {
      return res.status(400).json({ message: "Slot not available or already booked" });
    }
    bookedSlot = true;

    const appt = await Appointment.create({
      patientId,
      patientModel: p.model,

      doctorId,
      doctorModel: d.model,

      startTime: start,
      endTime: end,

      status: "pending",

      availabilitySlotStart: start,
      availabilitySlotEnd: end,
    });

    const populated = await Appointment.findById(appt._id)
      .populate("doctorId", "username email specialization role")
      .populate("patientId", "username email role");

    // AUTO NOTIFY
    try {
      await notifyUser({
        userId: doctorId,
        title: "New Appointment Request",
        body: "A patient booked a slot. Please confirm or reject.",
        data: {
          kind: "APPOINTMENT_REQUEST",
          appointmentId: appt._id.toString(),
          patientId: patientId.toString(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      });
    } catch (err) {
      console.log("🔕 Notify doctor failed:", err.message);
    }

    return res.status(201).json({ message: "Appointment created", appointment: populated });
  } catch (e) {
    // rollback if needed
    try {
      if (bookedSlot) {
        const { doctorId, startTime, endTime } = req.body;
        await Availability.findOneAndUpdate(
          { doctorId, "slots.start": new Date(startTime), "slots.end": new Date(endTime) },
          { $set: { "slots.$.isBooked": false } }
        );
      }
    } catch {}
    return res.status(500).json({ message: "Error creating appointment", error: e.message });
  }
};

// DOCTOR confirm / reject 
export const confirmAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { appointmentId, action, rejectReason } = req.body;
    

    if (!doctorId) return res.status(401).json({ message: "Unauthorized" });
    if (!appointmentId) return res.status(400).json({ message: "appointmentId required" });

    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (appt.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: "Not your appointment" });
    }

    const act = (action || "confirm").toLowerCase();

    if (act === "confirm") {
      if (appt.status !== "pending") {
        return res.status(400).json({ message: `Cannot confirm. Current status: ${appt.status}` });
      }
      appt.status = "confirmed";
      appt.confirmedAt = new Date();
      await appt.save();
    } else if (act === "reject") {
      if (appt.status !== "pending") {
        return res.status(400).json({ message: `Cannot reject. Current status: ${appt.status}` });
      }
      appt.status = "rejected";
      appt.rejectedAt = new Date();
      appt.rejectReason = rejectReason || "Rejected by doctor";
      await appt.save();

      // free the slot back
      await Availability.findOneAndUpdate(
        {
          doctorId: appt.doctorId,
          "slots.start": appt.availabilitySlotStart,
          "slots.end": appt.availabilitySlotEnd,
        },
        { $set: { "slots.$.isBooked": false } }
      );
    } else {
      return res.status(400).json({ message: "Invalid action. Use confirm/reject" });
    }

    //  AUTO NOTIFY: patient gets appointment status update
    try {
      const msg =
        appt.status === "confirmed"
          ? "Your appointment was confirmed."
          : "Your appointment was rejected.";

      await notifyUser({
        userId: appt.patientId,
        title: "Appointment Update",
        body: msg,
        data: {
          kind: "APPOINTMENT_STATUS",
          appointmentId: appt._id.toString(),
          status: appt.status,
          rejectReason: appt.rejectReason || null,
        },
      });
    } catch (err) {
      console.log("🔕 Notify patient failed:", err.message);
    }

    const populated = await Appointment.findById(appt._id)
      .populate("doctorId", "username email specialization role")
      .populate("patientId", "username email role");

    res.json({ message: "Appointment updated", appointment: populated });
  } catch (e) {
    res.status(500).json({ message: "Error confirming appointment", error: e.message });
  }
};

// PATIENT get my appointments
export const getMyAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;
    if (!patientId) return res.status(401).json({ message: "Unauthorized" });

    const appointments = await Appointment.find({ patientId })
      .populate("doctorId", "username email specialization role")
      .sort({ startTime: -1 });

    res.json({ appointments });
  } catch (e) {
    res.status(500).json({ message: "Error fetching appointments", error: e.message });
  }
};

// DOCTOR view requests list 
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { status = "pending" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor id" });
    }

    const query = { doctorId };

    // apply filter only if not "all"
    if (status && status !== "all") {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "username email age gender sex phone firstName lastName")
      .sort({ createdAt: -1 });

    return res.json({ appointments });
  } catch (e) {
    return res.status(500).json({
      message: "Error fetching doctor appointments",
      error: e.message,
    });
  }
};
