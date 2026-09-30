import { Router } from "express";
import {
  sendMessage,
  getAllChats,
  deleteChats,
} from "../controllers/chat.js";
import { verifyToken } from "../middlewares/auth.js";
const chatRoutes = Router();
chatRoutes.post("/new", verifyToken, sendMessage);
chatRoutes.get("/all-chats", verifyToken, getAllChats);
chatRoutes.delete("/delete", verifyToken, deleteChats);
export default chatRoutes;
