const express = require("express");

// Importing controller functions and middleware
const { 
    createKaizenIdea, 
    getKaizenIdeaById, 
    updateKaizenIdea, 
    deleteKaizenIdea, 
    getAllKaizenIdeas 
} = require("../controllers/KaizenController");

const { uploadKaizenFiles, mapFilesToFields } = require("../middleware/uploadMiddleware"); // Import the upload middleware

const router = express.Router();

// Create a Kaizen with image, PDF, and PowerPoint uploads
router.post("/create", uploadKaizenFiles, mapFilesToFields, createKaizenIdea);

// List all Kaizens with pagination & filters (MUST come before `/:id`)
router.get("/", getAllKaizenIdeas);

// Get a specific Kaizen by ID
router.get("/:id", getKaizenIdeaById);

// Update a specific Kaizen
router.put("/:id", updateKaizenIdea);

// Delete a specific Kaizen
router.delete("/:id", deleteKaizenIdea);

module.exports = router;
