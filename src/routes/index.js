import { Router } from "express";
import userRoutes from "./auth.js";
import chatRoutes from "./chat.js";
const appRoutes = Router();
appRoutes.use("/user", userRoutes);
appRoutes.use("/chats", chatRoutes);
export default appRoutes;
