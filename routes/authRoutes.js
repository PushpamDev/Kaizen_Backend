const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { generateToken } = require("../utils/jwt");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermissions"); // Updated import

const allowedRoles = ["super admin", "admin", "approver", "normal user"]; // Updated role list

// ✅ Register User
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // ✅ Validate input
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // ✅ Normalize role to lowercase and validate
        const normalizedRole = role.toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ success: false, message: "Invalid role provided." });
        }

        // ✅ Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists." });
        }

        // ✅ Hash password & create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role: normalizedRole });
        await newUser.save();

        // ✅ Generate JWT token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error("🚨 Server Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// ✅ Get All Users (Only admins & super admins can access)
router.get("/users", authMiddleware, checkPermission("readAny", "profile"), async (req, res) => {
    try {
        const users = await User.find().select("-password"); // Exclude password field
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

        // ✅ Normalize role to lowercase and validate
        const normalizedRole = role.toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ success: false, message: "Invalid role provided." });
        }

        // ✅ Prevent super admin from being downgraded unless another exists
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) return res.status(404).json({ success: false, message: "User not found" });

        if (userToUpdate.role === "super admin" && normalizedRole !== "super admin") {
            const superAdminCount = await User.countDocuments({ role: "super admin" });
            if (superAdminCount <= 1) {
                return res.status(403).json({ success: false, message: "Cannot remove the last super admin." });
            }
        }

        // ✅ Update user role
        const updatedUser = await User.findByIdAndUpdate(id, { role: normalizedRole }, { new: true }).select("-password");

        res.json({ success: true, message: "User role updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }

    // ✅ Login Route (Authenticate User)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        // ✅ Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or password." });
        }

        // ✅ Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password." });
        }

        // ✅ Generate JWT token
        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("🚨 Server Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

});

module.exports = router;
