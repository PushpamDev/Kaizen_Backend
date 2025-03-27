require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

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

    // Middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
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

    // Mount API Routes
    app.use("/api/kaizen", kaizenRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/upload", uploadRoutes);
    app.use("/api/employees", employeeRoutes);
    app.use("/api/status", employeeVerificationRoutes);
    app.use("/api/approval-workflow", approvalWorkflowRoutes);

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error("🔥 Server Error:", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    });

    // AdminJS setup (optional for tests)
    try {
        const { adminJs, adminRouter } = await import("./admin.mjs");
        app.use(adminJs.options.rootPath, adminRouter);
        console.log(`✅ AdminJS Ready at ${adminJs.options.rootPath}`);
    } catch (err) {
        console.error("❌ AdminJS Load Error:", err.message);
    }

    return app;
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== "test") {
    setupApp().then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    });
}

module.exports = setupApp; // Export the setup function
module.exports.app = app; // Export app for testing purposes
