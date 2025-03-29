const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id.toString(), 
            role: user.role, 
            plantCode: user.plantCode //  Include plantCode in token
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: "7d" }  // Token expires in 7 days
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error("🔥 JWT Verification Failed:", error.message);

        // Handle different error cases
        if (error.name === "TokenExpiredError") {
            return { error: "Token has expired" };
        }
        if (error.name === "JsonWebTokenError") {
            return { error: "Invalid token" };
        }

        return { error: "Token verification failed" };
    }
};

module.exports = { generateToken, verifyToken };
