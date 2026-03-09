

import bcrypt from "bcrypt";
import SuperUser from "../models/superUser.js";
import { uploadToSupabase } from "../services/uploadService.js";


export async function createSuperUser(req, res) {
  try {
    const {
      username,
      email,
      password,
      role,
      certificate_id,
      specialization,
      license_id,
    } = req.body;

    // base validations
    if (!username || !email || !password || !role || !certificate_id) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["username", "email", "password", "role", "certificate_id"],
      });
    }

    // only allow doctor/pharmacy
    if (!["doctor", "pharmacy"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Allowed: doctor, pharmacy" });
    }

    // role-based validations
    if (role === "doctor" && !specialization) {
      return res.status(400).json({ message: "Specialization is required for doctor accounts" });
    }
    if (role === "pharmacy" && !license_id) {
      return res.status(400).json({ message: "License ID is required for pharmacy accounts" });
    }

    // unique checks
    const existingEmail = await SuperUser.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) return res.status(409).json({ message: "Email already registered" });

    const existingCert = await SuperUser.findOne({ certificate_id: certificate_id.trim() });
    if (existingCert) return res.status(409).json({ message: "Certificate ID already registered" });

    // file check (multer must be upload.single("certificate_image"))
    if (!req.file) {
      return res.status(400).json({ message: "Certificate image is required" });
    }

    // upload file to supabase
    const certificateImageUrl = await uploadToSupabase(req.file, role);

    // hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const superUser = new SuperUser({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      certificate_id: certificate_id.trim(),
      specialization: role === "doctor" ? String(specialization).trim() : "",
      license_id: role === "pharmacy" ? String(license_id).trim() : "",
      certificate_image: certificateImageUrl,
      isApproved: false,
    });

    await superUser.save();

    return res.status(201).json({
      message: "SuperUser registration submitted. Waiting for admin approval.",
      user: {
        id: superUser._id,
        username: superUser.username,
        email: superUser.email,
        role: superUser.role,
        certificate_id: superUser.certificate_id,
        specialization: superUser.specialization,
        license_id: superUser.license_id,
        certificate_image: superUser.certificate_image,
        isApproved: superUser.isApproved,
        createdAt: superUser.createdAt,
      },
    });
  } catch (err) {
    console.error("[ERROR] Create SuperUser:", err);
    return res.status(500).json({ message: "Error creating super user", error: err.message });
  }
}

export async function getSuperUsers(req, res) {
  try {
    const users = await SuperUser.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching super users", error: err.message });
  }
}

export async function getPendingSuperUsers(req, res) {
  try {
    const users = await SuperUser.find({ isApproved: false }).select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching pending super users", error: err.message });
  }
}


export async function approveSuperUser(req, res) {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can approve users." });
    }

    const user = await SuperUser.findById(id);
    if (!user) return res.status(404).json({ message: "SuperUser not found" });

    user.isApproved = true;
    await user.save();

    return res.status(200).json({
      message: "SuperUser approved successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error approving super user", error: err.message });
  }
}

export async function rejectSuperUser(req, res) {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can reject users." });
    }

    const user = await SuperUser.findById(id);
    if (!user) return res.status(404).json({ message: "SuperUser not found" });

    user.isApproved = false;
    await user.save();

    return res.status(200).json({
      message: "SuperUser approval revoked",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Error rejecting super user", error: err.message });
  }
}

// approved doctors only
export async function getDoctors(req, res) {
  try {
    const doctors = await SuperUser.find({ role: "doctor", isApproved: true }).select("-password");
    return res.status(200).json({ count: doctors.length, doctors });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching doctors", error: err.message });
  }
}

// approved pharmacies only
export async function getPharmacies(req, res) {
  try {
    const pharmacies = await SuperUser.find({ role: "pharmacy", isApproved: true }).select("-password");
    return res.status(200).json({ count: pharmacies.length, pharmacies });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching pharmacies", error: err.message });
  }
}




// new add with location part 2025/12/23
//new fields added: pharmacy_name, address, location
export async function updateMyPharmacyProfile(req, res) {
  try {
    const userId = req.user?.id; // verifyToken middleware sets this from JWT
    const { lat, lng, address, pharmacy_name } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await SuperUser.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "pharmacy") {
      return res.status(400).json({ message: "Only pharmacies can update location" });
    }

    // optional: must be approved first
    if (user.isApproved !== true) {
      return res.status(403).json({ message: "Account not approved yet" });
    }

    // location mandatory
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "lat and lng must be valid numbers" });
    }

    user.location = { type: "Point", coordinates: [lngNum, latNum] };

    // address optional
    if (typeof address === "string") user.address = address.trim();
    if (typeof pharmacy_name === "string") user.pharmacy_name = pharmacy_name.trim();

    user.isProfileComplete = true;

    await user.save();

    return res.status(200).json({
      message: "Pharmacy profile updated",
      user: {
        id: user._id,
        role: user.role,
        isApproved: user.isApproved,
        isProfileComplete: user.isProfileComplete,
        pharmacy_name: user.pharmacy_name,
        address: user.address,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("[ERROR] updateMyPharmacyProfile:", err);
    return res.status(500).json({ message: "Error updating pharmacy profile", error: err.message });
  }
}

