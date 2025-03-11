const express = require("express");
const { uploadKaizenFiles, mapFilesToFields } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/", uploadKaizenFiles, (req, res) => {
    try {
        console.log("✅ Upload Request Received");
        console.log("📂 Files Received:", req.files); // Log uploaded files

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        // Map uploaded file URLs
        const fileUrls = {};
        ["beforeKaizenFiles", "afterKaizenFiles", "beforeKaizenDocs", "afterKaizenDocs"].forEach(field => {
            if (req.files[field]) {
                fileUrls[field] = req.files[field].map(file =>
                    `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
                );
            }
        });

        console.log("🌐 File URLs:", fileUrls); // Debugging log

        res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            fileUrls
        });
    } catch (error) {
        console.error("❌ File Upload Error:", error);
        res.status(500).json({ success: false, message: "File upload failed", error: error.message });
    }
});

module.exports = router;
