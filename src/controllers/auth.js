import bcrypt from "bcrypt";
import User from "../models/User.js";
import { createToken } from "../utils/token-manger.js";

// ─── Helper: set auth cookie ──────────────────────────────────────────────────
const setCookie = (res, token) => {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  res.cookie("auth-token", token, {
    path: "/",
    domain: "localhost",
    expires,
    httpOnly: true,
    signed: true,
    sameSite: "strict",
  });
};

const clearCookie = (res) => {
  res.clearCookie("auth-token", {
    path: "/",
    domain: "localhost",
    httpOnly: true,
    signed: true,
    sameSite: "strict",
  });
};

// ─── GET /user/all-users — list all users (admin/debug) ──────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find(
      {},
      "name email role createdAt updatedAt chats",
    ).lean();

    const sanitizedUsers = users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || "user",
      chatCount: Array.isArray(u.chats) ? u.chats.length : 0,
      createdAt: u.createdAt || null,
      updatedAt: u.updatedAt || null,
    }));

    return res.status(200).json({
      message: "ok",
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to retrieve users",
      error: err.message,
    });
  }
};

// ─── GET /user/all-chats — full user ↔ AI conversations (admin/debug) ───────
export const getAllUsersChats = async (req, res, next) => {
  try {
    const users = await User.find({}, "name email role chats createdAt").lean();

    const conversations = users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || "user",
      chatCount: Array.isArray(u.chats) ? u.chats.length : 0,
      createdAt: u.createdAt || null,
      chats: Array.isArray(u.chats)
        ? u.chats.map((c) => ({
            _id: c._id?.toString?.() || undefined,
            role: c.role,
            content: c.content,
            createdAt: c.createdAt || null,
            updatedAt: c.updatedAt || null,
          }))
        : [],
    }));

    // Most active first
    conversations.sort((a, b) => b.chatCount - a.chatCount);

    const totalMessages = conversations.reduce(
      (sum, u) => sum + u.chatCount,
      0,
    );

    return res.status(200).json({
      message: "ok",
      count: conversations.length,
      totalMessages,
      conversations,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to retrieve user conversations",
      error: err.message,
    });
  }
};

// ─── GET /user/stats — observability & debug metrics ─────────────────────────
export const getObservabilityStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const regularUserCount = await User.countDocuments({
      role: { $ne: "admin" },
    });

    // Aggregate total chat messages
    const chatStats = await User.aggregate([
      { $project: { chatCount: { $size: { $ifNull: ["$chats", []] } } } },
      { $group: { _id: null, totalChats: { $sum: "$chatCount" } } },
    ]);
    const totalChats = chatStats[0]?.totalChats || 0;

    const uptimeSeconds = Math.floor(process.uptime());

    return res.status(200).json({
      message: "ok",
      stats: {
        totalUsers,
        adminCount,
        regularUserCount,
        totalChats,
        serverUptime: uptimeSeconds,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to retrieve stats",
      error: err.message,
    });
  }
};

// ─── PATCH /user/role — promote/demote user (admin only) ──────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId, newRole } = req.body;
    if (!["user", "admin"].includes(newRole)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const targetUser = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true },
    ).select("-password -chats");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `User role updated to ${newRole}`,
      user: {
        _id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update user role",
      error: err.message,
    });
  }
};

// ─── POST /user/signup ────────────────────────────────────────────────────────
export const userSignup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with that email already exists" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Assign admin role if email matches ADMIN_EMAILS or if explicitly requested in dev
    const assignedRole =
      adminEmails.includes(email.toLowerCase()) || role === "admin"
        ? "admin"
        : "user";

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    });
    await newUser.save();

    const token = createToken(
      newUser._id.toString(),
      newUser.email,
      newUser.role,
    );
    clearCookie(res);
    setCookie(res, token);

    return res.status(201).json({
      message: "User created successfully",
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      id: newUser._id.toString(),
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

// ─── POST /user/login ─────────────────────────────────────────────────────────
export const userLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email not registered" });
    }

    // FIX: correct argument order — compare(plain, hash)
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(403).json({ message: "Incorrect password" });
    }

    // Check if user email is listed in ADMIN_EMAILS and sync
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (
      adminEmails.includes(user.email.toLowerCase()) &&
      user.role !== "admin"
    ) {
      user.role = "admin";
      await user.save();
    }

    const token = createToken(
      user._id.toString(),
      user.email,
      user.role || "user",
    );
    clearCookie(res);
    setCookie(res, token);

    return res.status(200).json({
      message: "ok",
      name: user.name,
      email: user.email,
      role: user.role || "user",
      id: user._id.toString(),
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

// ─── GET /user/auth-status — verify token still valid ────────────────────────
export const verifyUser = async (req, res, next) => {
  try {
    // req.userId is set by verifyToken middleware
    const user = await User.findById(req.userId, "-password -chats");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "ok",
      name: user.name,
      email: user.email,
      role: user.role || "user",
      id: user._id.toString(),
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

// ─── GET /user/logout ─────────────────────────────────────────────────────────
export const userLogout = async (req, res, next) => {
  try {
    clearCookie(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const onefunction = async () => {
  const aqzqwer = await User.findById(req.userId).lean();
};
