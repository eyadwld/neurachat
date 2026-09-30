import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  const token = req.signedCookies["auth-token"];

  if (!token || token.trim() === "") {
    return res.status(401).json({ message: "Authentication required. Token not received." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user id and metadata to request
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role || "user";
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or token invalid" });
  }
};

export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify role directly from database to prevent stale token bypass
    const user = await User.findById(req.userId).select("role email");
    if (!user) {
      return res.status(401).json({ message: "User account not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Access forbidden: Administrator privileges required for observability and debug monitoring",
      });
    }

    req.currentUser = user;
    return next();
  } catch (err) {
    return res.status(500).json({
      message: "Authorization verification failed",
      error: err.message,
    });
  }
};

