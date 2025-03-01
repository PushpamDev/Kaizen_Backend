const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        req.user = decoded;  // Attach user info to request
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
};

module.exports = authMiddleware;
