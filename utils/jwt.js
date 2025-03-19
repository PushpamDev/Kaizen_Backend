const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id.toString(), role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: "7d" }  // Token expires in 7 days
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error("JWT Verification Failed:", error.message);
        return null; // Return null instead of crashing the app
    }
};

module.exports = { generateToken, verifyToken };
