const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const KaizenIdea = require("../models/KaizenIdea");

const { 
    createKaizenIdea,  
    updateKaizenIdea, 
    deleteKaizenIdea, 
    getAllKaizenIdeas, 
    getKaizenIdeaByRegistrationNumber,
    getIdeasByStatus,
    generateRegistrationNumber
} = require("../controllers/KaizenController");
const { authMiddleware, enforcePlantCode } = require("../middleware/authMiddleware");

// ✅ Unprotected Routes
router.post("/create", createKaizenIdea);
router.get("/generate-form-id", async (req, res) => {
    try {
        const formId = uuidv4();
        res.status(200).json({ success: true, formId });
    } catch (error) {
        console.error("❌ Error generating formId:", error);
        res.status(500).json({ success: false, message: "Error generating formId", error: error.message });
    }
});
router.get("/generate-and-redirect", async (req, res) => {
    try {
        const formId = uuidv4();
        res.redirect(`https://yourapp.com/kaizen-form?formId=${formId}`);
    } catch (error) {
        console.error("❌ Error generating formId:", error);
        res.status(500).json({ success: false, message: "Error generating formId", error: error.message });
    }
});
router.post("/generate-registration-number", generateRegistrationNumber); // Unprotected as requested

// ✅ Protected Routes
router.get("/", authMiddleware, enforcePlantCode, getAllKaizenIdeas);
router.get("/by-registration", authMiddleware, enforcePlantCode, getKaizenIdeaByRegistrationNumber);
router.put("/:id", authMiddleware, enforcePlantCode, updateKaizenIdea);
router.delete("/:id", authMiddleware, enforcePlantCode, deleteKaizenIdea);
router.get("/status", authMiddleware, enforcePlantCode, getIdeasByStatus);

// ✅ Global error handler
router.use((err, req, res, next) => {
    console.error("🔥 Global Error Handler in kaizenRoutes:", err.stack);
    res.status(500).json({ success: false, message: "An error occurred", error: err.message });
});

module.exports = router;