const express = require("express");
const { v4: uuidv4 } = require("uuid");
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

// ✅ Route to generate a unique formId
router.get("/generate-form-id", async (req, res) => {
    try {
        const formId = uuidv4(); // Generate unique ID
        res.status(200).json({ success: true, formId });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating formId", error: error.message });
    }
});

// ✅ Create a new Kaizen idea
router.post("/create", createKaizenIdea);

// ✅ List all Kaizens with pagination & filters
router.get("/", getAllKaizenIdeas);
router.get("/generate-and-redirect", async (req, res) => {
    try {
        const formId = uuidv4(); // Generate a new formId

        // Redirect user to the form page with formId as a URL parameter
        res.redirect(`https://yourapp.com/kaizen-form?formId=${formId}`);
    } catch (error) {
        console.error("Error generating formId:", error);
        res.status(500).json({ success: false, message: "Error generating formId" });
    }
});

// ✅ Get a specific Kaizen by registration number
router.get("/by-registration", getKaizenIdeaByRegistrationNumber);

// ✅ Update a specific Kaizen
router.put("/:id", updateKaizenIdea);

// ✅ Delete a specific Kaizen
router.delete("/:id", deleteKaizenIdea);

// ✅ Get Kaizens by status
router.get("/status", getIdeasByStatus);

// ✅ Global error handler
router.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler:", err);
    res.status(500).json({ success: false, message: "An error occurred", error: err.message });
});

module.exports = router;
