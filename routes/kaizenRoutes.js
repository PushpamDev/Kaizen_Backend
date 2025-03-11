const express = require("express");

// Import controller functions
const { 
    createKaizenIdea,  
    updateKaizenIdea, 
    deleteKaizenIdea, 
    getAllKaizenIdeas, 
    getKaizenIdeaByRegistrationNumber 
} = require("../controllers/KaizenController");

const router = express.Router();

// ✅ Middleware to parse JSON & URL-encoded data
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// ✅ `createKaizenIdea` now expects **only JSON** (No multer here)
router.post("/create", createKaizenIdea);

// List all Kaizens with pagination & filters
router.get("/", getAllKaizenIdeas);

// Get a specific Kaizen by registration number
router.get("/by-registration", getKaizenIdeaByRegistrationNumber);

// Update a specific Kaizen
router.put("/:id", updateKaizenIdea);

// Delete a specific Kaizen
router.delete("/:id", deleteKaizenIdea);

// ✅ Global error handler
router.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err);
    res.status(500).json({ success: false, message: "An error occurred", error: err.message });
});

module.exports = router;
