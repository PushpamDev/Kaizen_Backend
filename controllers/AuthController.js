const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const { User } = require("../models/UserModel");

// ✅ Ensure rolePermissions is properly defined here
const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    "admin": ["assign_approver", "approve_kaizen", "reject_kaizen"],
    "approver": ["approve_kaizen", "reject_kaizen"],
    "user": ["submit_kaizen", "view_kaizen_form"]
};

// ✅ Register User (with Plant Code)
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, plantCode } = req.body;

        // Check if all fields are provided
        if (!name || !email || !password || !role || !plantCode) {
            return res.status(400).json({ success: false, message: "All fields including plantCode are required" });
        }

        // Validate role
        if (!rolePermissions[role]) {
            return res.status(400).json({ success: false, message: "Invalid role" });
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
        console.error("🚨 Error in registerUser:", error);
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
        console.error("🚨 Error in loginUser:", error);
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

        if (!rolePermissions[role]) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.role = role;
        user.permissions = rolePermissions[role]; // ✅ Set permissions correctly
        await user.save();

        res.json({ success: true, message: "User role updated successfully", user });
    } catch (error) {
        console.error("🚨 Error in updateUserRole:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { registerUser, loginUser, updateUserRole };
