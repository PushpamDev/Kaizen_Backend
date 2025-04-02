require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken"); // Add JWT for authentication

const app = express();

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        console.warn("⚠️ No token provided in request");
        return res.status(401).json({ success: false, message: "No token provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        req.user = decoded;
        console.log("✅ Token verified, user:", decoded);
        next();
    } catch (error) {
        console.error("❌ Invalid token:", error.message);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

// Function to set up the app
const setupApp = async () => {
    // Ensure Mongo URI exists
    if (!process.env.MONGO_URI) {
        console.error("❌ Mongo URI not found in environment variables");
        process.exit(1);
    }

    console.log("🔎 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch((err) => {
            console.error("❌ MongoDB Connection Error:", err.message);
            process.exit(1);
        });

    // AdminJS setup (must be BEFORE body-parser)
    try {
        const { adminJs, adminRouter } = await import("./admin.mjs");
        app.use(adminJs.options.rootPath, adminRouter);
        console.log(`✅ AdminJS Ready at ${adminJs.options.rootPath}`);
    } catch (err) {
        console.error("❌ AdminJS Load Error:", err.message);
    }

    // Move body-parser AFTER AdminJS
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Other middleware
    app.use(cors());
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // Import API Routes
    const kaizenRoutes = require("./routes/kaizenRoutes");
    const categoryRoutes = require("./routes/categoryRoutes");
    const authRoutes = require("./routes/authRoutes");
    const uploadRoutes = require("./routes/fileUploadRoutes");
    const employeeRoutes = require("./routes/employeeRoutes");
    const employeeVerificationRoutes = require("./routes/employeeVerificationRoutes");
    const approvalWorkflowRoutes = require("./routes/ApprovalWorkflowRoutes");
    const organizationRoutes = require("./routes/organizationRoutes");
    const fileSettingsRoutes = require("./routes/fileSettingsRoutes");
    const qrCodeRoutes = require("./routes/qrCodeRoutes");

    // Mount API Routes with authMiddleware where needed
    app.use("/api/kaizen", kaizenRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/auth", authRoutes, authMiddleware); 
    app.use("/api/upload", uploadRoutes);
    app.use("/api/employees", employeeRoutes);
    app.use("/api/status", employeeVerificationRoutes);
    app.use("/api/approval-workflow", authMiddleware, approvalWorkflowRoutes);
    app.use("/api/organization", authMiddleware, organizationRoutes);
    app.use("/api/file-settings", fileSettingsRoutes);
    app.use("/api", qrCodeRoutes);

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error("🔥 Server Error:", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    });

    return app;
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== "test") {
    setupApp().then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    });
}

module.exports = setupApp;
module.exports.app = app;