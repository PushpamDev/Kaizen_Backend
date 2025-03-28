const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const { User } = require("../models/UserModel");

// ✅ Role-based Permissions
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

        if (!name || !email || !password || !role || !plantCode) {
            return res.status(400).json({ success: false, message: "All fields including plantCode are required" });
        }

        if (!rolePermissions[role]) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        let user = await User.findOne({ email, plantCode });
        if (user) {
            return res.status(400).json({ success: false, message: "User already exists for this Plant Code" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({ name, email, password: hashedPassword, role, plantCode, permissions: rolePermissions[role] });
        await user.save();

        const token = generateToken(user);

        res.status(201).json({ success: true, message: "User registered successfully", token, user });
    } catch (error) {
        console.error("🚨 Error in registerUser:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Login User (with Plant Code)
const loginUser = async (req, res) => {
    try {
        const { email, password, plantCode } = req.body;

        if (!email || !password || !plantCode) {
            return res.status(400).json({ success: false, message: "Email, password, and plantCode are required" });
        }

        const user = await User.findOne({ email, plantCode });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const token = generateToken(user);

        res.json({ success: true, message: "Login successful", token, user });
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

        // 🚨 Prevent removing the last super admin
        if (user.role === "super admin") {
            const superAdminCount = await User.countDocuments({ role: "super admin" });
            if (superAdminCount === 1) {
                return res.status(403).json({ success: false, message: "Cannot remove the last super admin." });
            }
        }

        user.role = role;
        user.permissions = rolePermissions[role];
        await user.save();

        res.json({ success: true, message: "User role updated successfully", user });
    } catch (error) {
        console.error("🚨 Error in updateUserRole:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Update User Name and Password with Current Password Authentication
const updateUserDetails = async (req, res) => {
    try {
        const { name, password, currentPassword } = req.body;
        const { id } = req.params;

        // Validate request body
        if (!currentPassword) {
            return res.status(400).json({ success: false, message: "Current password is required" });
        }
        if (!name && !password) {
            return res.status(400).json({ success: false, message: "At least one field (name or password) is required to update" });
        }

        // Find the user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        // Update fields if provided
        if (name) {
            user.name = name;
            console.log(`🔄 Updating name to: ${name}`);
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
            console.log("🔄 Password updated");
        }

        // Save the updated user
        await user.save();

        console.log(`✅ User ${id} details updated successfully`);
        res.json({ success: true, message: "User details updated successfully", user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("🚨 Error in updateUserDetails:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
module.exports = { registerUser, loginUser, updateUserRole, updateUserDetails };