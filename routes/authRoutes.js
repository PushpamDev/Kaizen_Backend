const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { generateToken } = require("../utils/jwt");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermissions");

const router = express.Router();

// ✅ Allowed Roles (Ensure consistency)
const allowedRoles = ["super admin", "admin", "approver", "user"];

// ✅ Register User (with Plant Code)
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role, plantCode } = req.body;

        if (!name || !email || !password || !role || !plantCode) {
            return res.status(400).json({ success: false, message: "All fields including plantCode are required." });
        }

        const normalizedRole = role.toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ success: false, message: "Invalid role provided." });
        }

        const existingUser = await User.findOne({ email, plantCode });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists for this plantCode." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role: normalizedRole, plantCode });
        await newUser.save();

        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, plantCode }
        });
    } catch (error) {
        console.error("🚨 Server Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Get All Users (Only admins & super admins)
router.get("/users", authMiddleware, checkPermission("readAny", "profile"), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Update User Role (Only super admins & admins)
router.put("/update-role/:id", authMiddleware, checkPermission("updateAny", "profile"), async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        if (!role) {
            return res.status(400).json({ success: false, message: "Role is required." });
        }

        const normalizedRole = role.toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ success: false, message: "Invalid role provided." });
        }

        const userToUpdate = await User.findById(id);
        if (!userToUpdate) return res.status(404).json({ success: false, message: "User not found." });

        // Prevent removing the last super admin
        if (userToUpdate.role === "super admin" && normalizedRole !== "super admin") {
            const superAdminCount = await User.countDocuments({ role: "super admin" });
            if (superAdminCount <= 1) {
                return res.status(403).json({ success: false, message: "Cannot remove the last super admin." });
            }
        }

        userToUpdate.role = normalizedRole;
        userToUpdate.permissions = rolePermissions[normalizedRole] || [];
        await userToUpdate.save();

        res.json({ success: true, message: "User role updated successfully", user: userToUpdate });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Login User (with Plant Code)
router.post("/login", async (req, res) => {
    try {
        const { email, password, plantCode } = req.body;

        if (!email || !password || !plantCode) {
            return res.status(400).json({ success: false, message: "Email, password, and plantCode are required." });
        }

        const user = await User.findOne({ email, plantCode });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, plantCode }
        });
    } catch (error) {
        console.error("🚨 Server Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

module.exports = router;
