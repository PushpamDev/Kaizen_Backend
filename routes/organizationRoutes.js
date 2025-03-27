const express = require("express");
const multer = require("multer");
const OrganizationLogo = require("../models/OrganizationLogo");

const router = express.Router();

// Multer Storage (Stores file in memory instead of disk)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB Limit

// Upload and Save Image to MongoDB
router.post("/upload-logo", upload.single("logo"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        // Remove old logo if it exists (Optional)
        await OrganizationLogo.deleteMany();

        // Save new logo
        const newLogo = new OrganizationLogo({
            logo: req.file.buffer, // Store binary data
            contentType: req.file.mimetype,
        });

        await newLogo.save();

        res.json({ success: true, message: "Logo uploaded successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// Retrieve the Logo
router.get("/logo", async (req, res) => {
    try {
        const logoData = await OrganizationLogo.findOne();
        if (!logoData) {
            return res.status(404).json({ success: false, message: "No logo found" });
        }

        res.set("Content-Type", logoData.contentType);
        res.send(logoData.logo);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

module.exports = router;
