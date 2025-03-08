const express = require("express");

// Import controller functions
const { 
    createKaizenIdea,  
    updateKaizenIdea, 
    deleteKaizenIdea, 
    getAllKaizenIdeas, 
    getKaizenIdeaByRegistrationNumber 
} = require("../controllers/KaizenController");

const { getKaizenStatusByRegNumber , updateKaizenStatus} = require("../controllers/kaizenStatusController"); // Import status update controller

const router = express.Router();

// Middleware to ensure form-data text fields are properly parsed
router.use(express.urlencoded({ extended: true })); // Parses form-data text fields
router.use(express.json()); // Ensures JSON parsing works

// Create a Kaizen
router.post("/create", createKaizenIdea);

// List all Kaizens with pagination & filters
router.get("/", getAllKaizenIdeas);

// Get a specific Kaizen by ID
router.get("/by-registration", getKaizenIdeaByRegistrationNumber); // Fetch by registration number

// Update a specific Kaizen
router.put("/:id", updateKaizenIdea);

// Get Kaizen status Bar
// router.get("/status/:registrationNumber", getKaizenStatusByRegNumber);

// Update Kaizen Status by Registration Number
// router.put("/status/update/:registrationNumber", updateKaizenStatus);

// Delete a specific Kaizen
router.delete("/:id", deleteKaizenIdea);

// Global error handler (Optional, but recommended)
router.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err);
    res.status(500).json({ success: false, message: "An error occurred", error: err.message });
});

module.exports = router;
