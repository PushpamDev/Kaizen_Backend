const express = require("express");
const router = express.Router();
const KaizenIdea = require("../models/KaizenIdea");

// Import controller functions
const { 
    createKaizenIdea,  
    updateKaizenIdea, 
    deleteKaizenIdea, 
    getAllKaizenIdeas, 
    getKaizenIdeaByRegistrationNumber,
    getIdeasByStatus
} = require("../controllers/KaizenController");

// ✅ Middleware to parse JSON & URL-encoded data
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// ✅ Create a new Kaizen idea
router.post("/create", createKaizenIdea);

// ✅ List all Kaizens with pagination & filters
router.get("/", getAllKaizenIdeas);

// ✅ Get a specific Kaizen by registration number
router.get("/by-registration", getKaizenIdeaByRegistrationNumber);

// ✅ Update a specific Kaizen
router.put("/:id", updateKaizenIdea);

// ✅ Delete a specific Kaizen
router.delete("/:id", deleteKaizenIdea);

// Get Kaizens by status
router.get("/status", getIdeasByStatus);

// ✅ Global error handler
router.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err);
    res.status(500).json({ success: false, message: "An error occurred", error: err.message });
});

module.exports = router;
