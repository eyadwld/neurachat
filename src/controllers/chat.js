import { GoogleGenAI } from "@google/genai";
import User from "../models/User.js";

// System instruction to shape NeuraChat's personality
const SYSTEM_INSTRUCTION = `You are NeuraChat, an advanced AI assistant built by NeuraChat Labs.
You are helpful, intelligent, creative, and friendly. You provide clear, concise, and accurate answers.
When writing code, always use proper formatting with code blocks. 
You can handle any topic: coding, writing, analysis, math, general knowledge, and more.`;

// ─── POST /chats/new ─────────────────────────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        message: "Invalid Gemini API Key",
        error:
          "Please add your free Gemini API key to backend/.env (GEMINI_API_KEY=...). You can obtain one at https://aistudio.google.com/app/apikey",
      });
    }

    // Initialize @google/genai SDK
    const ai = new GoogleGenAI({ apiKey });

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build conversation history for multi-turn chat
    const history = user.chats.map((chat) => ({
      role: chat.role === "model" ? "model" : "user",
      parts: [{ text: chat.content }],
    }));

    // Create chat session with gemini-3.6-flash
    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history,
    });

    const response = await chat.sendMessage({ message });
    const aiResponse = response.text;

    // Persist both messages to MongoDB
    user.chats.push({ role: "user", content: message });
    user.chats.push({ role: "model", content: aiResponse });
    await user.save();

    return res.status(200).json({
      message: "ok",
      chats: user.chats,
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({
      message: "Gemini API Error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

// ─── GET /chats/all-chats ─────────────────────────────────────────────────────
export const getAllChats = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "ok", chats: user.chats });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

// ─── DELETE /chats/delete ─────────────────────────────────────────────────────
export const deleteChats = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.chats = [];
    await user.save();
    return res.status(200).json({ message: "Chats cleared successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};
