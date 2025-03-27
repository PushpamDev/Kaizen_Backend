const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models/UserModel");
const { generateToken } = require("../utils/jwt");
const { authMiddleware, authorizeRoles, enforcePlantCode } = require("../middleware/authMiddleware");

const router = express.Router();

// Allowed Roles
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

// ✅ Get All Users (Admins see only their plant; Super Admins see all)
router.get("/users", authMiddleware, enforcePlantCode, authorizeRoles("admin", "super admin"), async (req, res) => {
    try {
        let users;
        if (req.user.role === "super admin") {
            users = await User.find().select("-password");
        } else {
            users = await User.find({ plantCode: req.user.plantCode }).select("-password");
        }

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Update User Role (Super Admins only)
router.put("/update-role/:id", authMiddleware, authorizeRoles("super admin"), async (req, res) => {
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
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Prevent removing the last super admin
        if (userToUpdate.role === "super admin" && normalizedRole !== "super admin") {
            const superAdminCount = await User.countDocuments({ role: "super admin" });
            if (superAdminCount <= 1) {
                return res.status(403).json({ success: false, message: "Cannot remove the last super admin." });
            }
        }

        userToUpdate.role = normalizedRole;
        await userToUpdate.save();

        res.json({ success: true, message: "User role updated successfully", user: userToUpdate });
    } catch (error) {
        console.error("🚨 Error in updateUserRole:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Update User Name & Password (Only within the same plant)
router.put("/update-user/:id", authMiddleware, enforcePlantCode, async (req, res) => {
    try {
        const { name, password } = req.body;
        const { id } = req.params;

        if (!name && !password) {
            return res.status(400).json({ success: false, message: "Provide name or password to update." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Ensure users can only update users within their plant
        if (req.user.role !== "super admin" && user.plantCode !== req.user.plantCode) {
            return res.status(403).json({ success: false, message: "Access Denied. You can only update users within your plant." });
        }

        if (name) user.name = name;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();

        res.json({ success: true, message: "User details updated successfully", user });
    } catch (error) {
        console.error("🚨 Error in updateUser:", error);
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
