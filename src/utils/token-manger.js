import jwt from "jsonwebtoken";
export const createToken = (id, email, role = "user") => {
    const payload = {
        id,
        email,
        role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    return token;
};
