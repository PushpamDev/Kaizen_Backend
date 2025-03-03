require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Ensure Mongo URI is available in environment variables
if (!process.env.MONGO_URI) {
  console.error("❌ Mongo URI not found in environment variables");
  process.exit(1);  // Exit application if Mongo URI is not provided
}

console.log("🔎 MONGO_URI:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);  // Exit application if MongoDB connection fails
});

// Import Routes
const kaizenRoutes = require("./routes/kaizenRoutes");  // ✅ Import Kaizen routes
const categoryRoutes = require("./routes/categoryRoutes");  // ✅ Import Category routes
const authRoutes = require("./routes/authRoutes"); // ✅ Add Auth Routes

// API Routes
app.use("/api/kaizen", kaizenRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);  // ✅ Add authentication routes

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🌍 Server running on http://0.0.0.0:${PORT}`));
