import bcrypt from "bcrypt";
import User from "../models/User.js";
import { createToken } from "../utils/token-manger.js";
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        return res.status(200).json({
            message: "Ok",
            users: users,
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Error",
            error: err instanceof Error ? err.message : String(err),
        });
    }
};
export const userSignup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (user) {
            throw new Error("There is an account with that email");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({
            message: "User Created Successfully",
            id: newUser._id.toString(),
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Error",
            error: err instanceof Error ? err.message : String(err),
        });
    }
};
export const userLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ message: "User Not Resesters" });
        }
        const isPasswordMatch = await bcrypt.compare(user?.password, password);
        if (!isPasswordMatch) {
            return res.status(403).json({ message: "Incorrect Password" });
        }
        res.clearCookie("auth-token", {
            path: "/",
            domain: "localhost",
            httpOnly: true,
            signed: true,
            sameSite: "strict",
        });
        const token = createToken(user._id.toString(), user.email);
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
        res.status(200).json({ message: "ok", id: user._id.toString() });
    }
    catch (err) {
        res.status(500).json({
            message: "error",
            error: err instanceof Error ? err.message : String(err),
        });
    }
};
