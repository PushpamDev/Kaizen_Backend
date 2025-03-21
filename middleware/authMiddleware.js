const jwt = require("jsonwebtoken");
const {User} = require("../models/UserModel");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("❌ No token provided or invalid format.");
            return res.status(401).json({ success: false, message: "Access Denied. No token provided or invalid format." });
        }

        const token = authHeader.split(" ")[1]; // Extract token
        console.log("🔍 Extracted Token:", token);

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Decoded Token:", decoded);

        if (!decoded || !decoded.id) {
            console.log("❌ Invalid token payload.");
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        // Fetch user and exclude password
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            console.log("❌ User not found with ID:", decoded.id);
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Ensure user has a plantCode assigned
        if (!user.plantCode) {
            console.log("❌ User has no plantCode:", user.email);
            return res.status(403).json({ success: false, message: "Access Denied. No Plant Code assigned." });
        }

        console.log("✅ User authenticated:", user.email);
        req.user = user; // Attach user info to request
        next();
    } catch (error) {
        console.error("❌ JWT Error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        }
        return res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
};

module.exports = authMiddleware;
