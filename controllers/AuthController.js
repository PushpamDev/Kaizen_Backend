const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const User = require("../models/UserModel");
const { rolePermissions } = require("../models/UserModel"); // ✅ Corrected import


// ✅ Register User (with Plant Code)
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, plantCode } = req.body;

        // Check if all fields are provided
        if (!name || !email || !password || !role || !plantCode) {
            return res.status(400).json({ success: false, message: "All fields including plantCode are required" });
        }

        // Check if user already exists for the given email & plantCode
        let user = await User.findOne({ email, plantCode });
        if (user) {
            return res.status(400).json({ success: false, message: "User already exists for this Plant Code" });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        user = new User({ name, email, password: hashedPassword, role, plantCode, permissions: rolePermissions[role] });
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({ success: true, message: "User registered successfully", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Login User (with Plant Code)
const loginUser = async (req, res) => {
    try {
        const { email, password, plantCode } = req.body;

        // Check if all fields are provided
        if (!email || !password || !plantCode) {
            return res.status(400).json({ success: false, message: "Email, password, and plantCode are required" });
        }

        // Find user by email and Plant Code
        const user = await User.findOne({ email, plantCode });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(user);

        res.json({ success: true, message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Update User Role
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        if (!role) {
            return res.status(400).json({ success: false, message: "Role is required" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Ensure the role exists
        if (!rolePermissions[role]) {
            return res.status(400).json({ success: false, message: "Invalid role provided" });
        }

        user.role = role;
        user.permissions = rolePermissions[role]; // Now it works correctly ✅
        await user.save();

        res.json({ success: true, message: "User role updated successfully", user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


module.exports = { registerUser, loginUser, updateUserRole };
