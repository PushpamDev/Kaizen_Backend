const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { generateToken } = require("../utils/jwt");

// ✅ Register User
router.post("/register", async (req, res) => {
    console.log("📌 Register API hit");  // Debugging log
    console.log("📩 Request Body:", req.body); 

    try {
        const { name, email, password, role } = req.body;

        // ✅ Validate input
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // ✅ Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists." });
        }

        // ✅ Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create user
        const newUser = new User({ name, email, password: hashedPassword, role });
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

// ✅ Login User
router.post("/login", async (req, res) => {
    console.log("📌 Login API hit");  // Debugging log
    console.log("📩 Request Body:", req.body);

    try {
        const { email, password } = req.body;

        // ✅ Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        // ✅ Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or password." });
        }

        // ✅ Compare passwords
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

module.exports = router;
