const express = require("express");
const { uploadKaizenFiles, mapFilesToFields } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/", uploadKaizenFiles, mapFilesToFields, (req, res) => {
    try {
        console.log("✅ Upload Request Received");
        console.log("📂 Files Received:", req.files); // Log uploaded files
        console.log("📝 Form Data Received:", req.body); // Log text fields

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            files: req.files
        });
    } catch (error) {
        console.error("❌ File Upload Error:", error);
        res.status(500).json({ success: false, message: "File upload failed", error: error.message });
    }
});

module.exports = router;
