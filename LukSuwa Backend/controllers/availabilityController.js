


import mongoose from "mongoose";
import Availability from "../models/Availability.js";

// Doctor set weekly slots 
export const setWeeklyAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { slots } = req.body; 

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: "Slots array is required" });
    }

    // find doctor model
    const User = mongoose.model("User");
    const SuperUser = mongoose.model("SuperUser");

    let doctor = await User.findById(doctorId);
    let doctorModel = "User";
    if (!doctor) {
      doctor = await SuperUser.findById(doctorId);
      doctorModel = "SuperUser";
    }
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const normalized = slots.map((s) => ({
      start: new Date(s.start),
      end: new Date(s.end),
    }));

    for (const s of normalized) {
      if (!(s.start instanceof Date) || isNaN(s.start)) {
        return res.status(400).json({ message: "Invalid slot start" });
      }
      if (!(s.end instanceof Date) || isNaN(s.end)) {
        return res.status(400).json({ message: "Invalid slot end" });
      }
      if (s.end <= s.start) {
        return res.status(400).json({ message: "Slot end must be after start" });
      }
    }

    // old booked flags
    const existing = await Availability.findOne({ doctorId });

    const existingMap = new Map();
    if (existing?.slots?.length) {
      for (const s of existing.slots) {
        const key = `${new Date(s.start).toISOString()}__${new Date(s.end).toISOString()}`;
        existingMap.set(key, {
          start: new Date(s.start),
          end: new Date(s.end),
          isBooked: !!s.isBooked,
        });
      }
    }

    // merge new slots 
    for (const s of normalized) {
      const key = `${s.start.toISOString()}__${s.end.toISOString()}`;
      if (existingMap.has(key)) {
        const old = existingMap.get(key);
        existingMap.set(key, { start: s.start, end: s.end, isBooked: !!old.isBooked });
      } else {
        existingMap.set(key, { start: s.start, end: s.end, isBooked: false });
      }
    }

    // remove past slots
    const now = new Date();
    const mergedSlots = Array.from(existingMap.values())
      .filter((s) => new Date(s.end) > now)
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

    const doc = await Availability.findOneAndUpdate(
      { doctorId },
      { doctorId, doctorModel, slots: mergedSlots },
      { upsert: true, new: true }
    );

    res.json({ message: "Availability saved", availability: doc });
  } catch (e) {
    res.status(500).json({ message: "Error saving availability", error: e.message });
  }
};

// Patient view doctor availability
export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    const availability = await Availability.findOne({ doctorId });
    if (!availability) return res.json({ slots: [] });

    const now = new Date();

    const freeSlots = availability.slots
      .filter((s) => !s.isBooked && new Date(s.end) > now)
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

    const seen = new Set();
    const unique = [];
    for (const s of freeSlots) {
      const key = `${new Date(s.start).toISOString()}__${new Date(s.end).toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(s);
    }

    res.json({ slots: unique });
  } catch (e) {
    res.status(500).json({ message: "Error fetching availability", error: e.message });
  }
};
