

import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import SuperUser from "../models/superUser.js";
import User from "../models/user.js";

dotenv.config();

export const verifyToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Extract token
  let token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Remove surrounding quotes if any
  token = token.replace(/^"+|"+$/g, "").trim();
  token = token.replace(/^'+|'+$/g, "").trim();

  // Remove any spaces/newlines inside token
  token = token.replace(/\s+/g, "");

  // Must have 3 parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    return res.status(400).json({ error: "Malformed JWT token (must have 3 parts)" });
  }

  try {
    const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
    console.log("TOKEN PAYLOAD STRING =>", payloadStr);
  } catch (e) {
    console.log("PAYLOAD DECODE FAIL =>", e.message);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id, role, type, iat, exp }

    // Load user from DB (User or SuperUser)
    let userDoc = await User.findById(decoded.id).select("-password");
    let userType = "User";

    if (!userDoc) {
      userDoc = await SuperUser.findById(decoded.id).select("-password");
      userType = "SuperUser";
    }

    if (!userDoc) {
      return res.status(401).json({ error: "User not found for this token" });
    }

    // Block SuperUser not approved (if you want global restriction)
    if (userType === "SuperUser" && userDoc.isApproved === false) {
      return res.status(403).json({ error: "Account not approved yet", isApproved: false });
    }

    req.user = decoded;       // {id, role, type}
    req.authUser = userDoc;   // actual db document
    req.userType = userType;

    console.log("Token OK:", decoded, "type:", userType);
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

// Role-based access control
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: "No user role in token" });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: insufficient role",
        yourRole: req.user.role,
        allowedRoles: roles,
      });
    }
    next();
  };
};
