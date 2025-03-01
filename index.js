require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

console.log("🔎 MONGO_URI:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

const kaizenRoutes = require("./routes/kaizenRoutes");  // ✅ Import Kaizen routes
const categoryRoutes = require("./routes/categoryRoutes");  // ✅ Import Category routes

// API Routes
app.use("/api/kaizen", kaizenRoutes);
app.use("/api/categories", categoryRoutes);




// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌍 Server running on port ${PORT}`));
