const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Access Denied. No token provided or invalid format." });
        }

        const token = authHeader.split(" ")[1]; // Extract token

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        // Fetch user and exclude password
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Ensure user has a plantCode assigned
        if (!user.plantCode) {
            return res.status(403).json({ success: false, message: "Access Denied. No Plant Code assigned." });
        }

        req.user = user; // Attach user info to request
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        }
        return res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
};

module.exports = authMiddleware;
