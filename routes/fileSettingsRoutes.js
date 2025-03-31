const express = require("express");
const router = express.Router();
const FileSettings = require("../models/FileSettings");
const {authMiddleware} = require("../middleware/authMiddleware"); // If using authentication

// Get File Settings by Plant Code
router.get("/:plantCode", authMiddleware, async (req, res) => {
    try {
        const { plantCode } = req.params;
        const settings = await FileSettings.findOne({ plantCode });

        if (!settings) {
            return res.status(404).json({ success: false, message: "File settings not found." });
        }

        res.json({ success: true, fileSettings: settings });
    } catch (error) {
        console.error("Error fetching file settings:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Save or Update File Settings
router.post("/", authMiddleware, async (req, res) => {
    try {
        
        const { plantCode, maxFileSize, maxFileCount, allowedFileTypes } = req.body;

        let settings = await FileSettings.findOne({ plantCode });

        if (settings) {
            // Update existing settings
            settings.maxFileSize = maxFileSize;
            settings.maxFileCount = maxFileCount;
            settings.allowedFileTypes = allowedFileTypes;
            await settings.save();
        } else {
            // Create new settings
            settings = new FileSettings({ plantCode, maxFileSize, maxFileCount, allowedFileTypes });
            await settings.save();
        }

        res.json({ success: true, message: "File settings saved successfully." });
    } catch (error) {
        console.error("Error saving file settings:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;
