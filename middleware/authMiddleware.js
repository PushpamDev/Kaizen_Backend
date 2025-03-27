const jwt = require("jsonwebtoken");
const { User } = require("../models/UserModel");

// ✅ Role-based Permissions
const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    "admin": ["assign_approver", "approve_kaizen", "reject_kaizen"],
    "approver": ["approve_kaizen", "reject_kaizen"],
    "user": ["submit_kaizen", "view_kaizen_form"]
};

// ✅ Authentication Middleware
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

        if (!decoded || !decoded.id || !decoded.plantCode) {
            console.log("❌ Invalid token payload.");
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        // Fetch user and exclude password
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            console.log("❌ User not found with ID:", decoded.id);
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Attach user info and plantCode to request
        req.user = { ...user._doc, plantCode: decoded.plantCode };
        console.log(`✅ User authenticated: ${user.email} | Role: ${user.role} | Plant Code: ${user.plantCode}`);
        next();
    } catch (error) {
        console.error("❌ JWT Error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        }
        return res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
};

// ✅ Authorization Middleware for Role-based Access Control
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            console.log(`❌ Access Denied for User: ${req.user ? req.user.email : "Unknown"}`);
            return res.status(403).json({ success: false, message: "Access Denied. Insufficient permissions." });
        }
        console.log(`✅ Access Granted to: ${req.user.email} | Role: ${req.user.role}`);
        next();
    };
};

// ✅ Middleware to enforce plant-specific data filtering
const enforcePlantCode = async (req, res, next) => {
    try {
        if (!req.user || !req.user.plantCode) {
            console.log("❌ No plantCode found for user:", req.user ? req.user.email : "Unknown");
            return res.status(403).json({ success: false, message: "Access Denied. Plant Code is required." });
        }

        // Attach plantCode to request for filtering in controllers
        req.plantCode = req.user.plantCode;
        console.log(`🔍 Enforcing plantCode-based filtering: ${req.plantCode}`);
        next();
    } catch (error) {
        console.error("❌ Error in enforcePlantCode middleware:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { authMiddleware, authorizeRoles, enforcePlantCode };
