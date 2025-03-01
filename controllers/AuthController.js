const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { generateToken } = require("../utils/jwt");

// ✅ Register User
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ success: false, message: "User already exists" });

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        user = new User({ name, email, password: hashedPassword, role });
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({ success: true, message: "User registered successfully", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Login User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Invalid email or password" });

        const token = generateToken(user);

        res.json({ success: true, message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { registerUser, loginUser };
