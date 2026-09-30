import { Router } from "express";
import {
  userSignup,
  userLogin,
  verifyUser,
  userLogout,
  getAllUsers,
  getAllUsersChats,
  getObservabilityStats,
  updateUserRole,
} from "../controllers/auth.js";
import {
  loginValidator,
  signupValidator,
  validate,
} from "../utils/validators.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";

const userRoutes = Router();

userRoutes.post("/signup", validate(signupValidator), userSignup);
userRoutes.post("/login", validate(loginValidator), userLogin);
userRoutes.get("/auth-status", verifyToken, verifyUser);
userRoutes.get("/logout", verifyToken, userLogout);

// ─── Protected Admin & Observability Routes ──────────────────────────────────
userRoutes.get("/all-users", verifyToken, verifyAdmin, getAllUsers);
userRoutes.get("/all-chats", verifyToken, verifyAdmin, getAllUsersChats);
userRoutes.get("/stats", verifyToken, verifyAdmin, getObservabilityStats);
userRoutes.patch("/role", verifyToken, verifyAdmin, updateUserRole);

export default userRoutes;
