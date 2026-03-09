import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import SuperUser from "../models/superUser.js";
import User from "../models/user.js";

dotenv.config();

// JWT Token generate
const generateToken = (user, userType) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      type: userType, // "User" | "SuperUser"
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const emailNorm = String(email || "").toLowerCase().trim();

    let user = null;
    let userType = null;

    // Try SuperUser first
    user = await SuperUser.findOne({ email: emailNorm });
    if (user) userType = "SuperUser";

    // If not SuperUser, try normal User
    if (!user) {
      user = await User.findOne({ email: emailNorm });
      if (user) userType = "User";
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If SuperUser and not approved
    if (userType === "SuperUser" && user.isApproved === false) {
      return res.status(403).json({
        message:
          "Your account registration is pending admin approval. Please wait until an admin approves your account.",
        isApproved: false,
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate token
    const token = generateToken(user, userType);

    // Build response user (common fields)
    const responseUser = {
      id: user._id.toString(),
      _id: user._id.toString(), 
      username: user.username,
      email: user.email,
      role: user.role,
      type: userType,
    };

    // SuperUser-only fields
    if (userType === "SuperUser") {
      responseUser.isApproved = Boolean(user.isApproved);

      // shared optional fields
      responseUser.certificate_id = user.certificate_id || "";

      // doctor fields
      if (user.role === "doctor") {
        responseUser.specialization = user.specialization || "";
        responseUser.isProfileComplete = true; // doctor never needs completeProfile screen
        responseUser.locationSet = true;
      }

      // pharmacy fields
      if (user.role === "pharmacy") {
        responseUser.license_id = user.license_id || "";
        responseUser.pharmacy_name = user.pharmacy_name || "";
        responseUser.address = user.address || "";

        const coords = user.location?.coordinates;
        const locationSet = Array.isArray(coords) && coords.length === 2;

        responseUser.location = locationSet
          ? { type: "Point", coordinates: coords }
          : null;

        responseUser.locationSet = locationSet;
        responseUser.isProfileComplete = Boolean(user.isProfileComplete);
      }
    }

    return res.status(200).json({
      message: `${String(user.role || "user").charAt(0).toUpperCase() + String(user.role || "user").slice(1)} login successful`,
      token,
      user: responseUser,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Error logging in user",
      error: err.message,
    });
  }
}
