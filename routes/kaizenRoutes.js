const express = require("express");
const { 
    createKaizenIdea, 
    getKaizenById, 
    updateKaizen, 
    deleteKaizen, 
    listKaizens 
} = require("../controllers/KaizenController");
// const authMiddleware  = require("../middleware/authMiddleware");

const router = express.Router();

// Create a Kaizen
router.post("/create", createKaizenIdea);

// List all Kaizens with pagination & filters (MUST come before `/:id`)
router.get("/", listKaizens);  

// Get a specific Kaizen by ID
router.get("/:id", getKaizenById);

// Update a specific Kaizen
router.put("/:id", updateKaizen);

// Delete a specific Kaizen
router.delete("/:id", deleteKaizen);

module.exports = router;
