require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Ensure Mongo URI is available
if (!process.env.MONGO_URI) {
  console.error("❌ Mongo URI not found in environment variables");
  process.exit(1);
}

console.log("🔎 Connecting to MongoDB...");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// Import Routes
const kaizenRoutes = require("./routes/kaizenRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/fileUploadRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const employeeVerificationRoutes = require("./routes/employeeVerificationRoutes");
const approvalWorkflowRoutes = require("./routes/ApprovalWorkflowRoutes");

// Serve Static Files (Uploaded Files)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://localhost:${PORT}`));
