const express = require("express");
const { uploadKaizenFiles, mapFilesToFields } = require("../middleware/uploadMiddleware");
const router = express.Router();

router.post("/", uploadKaizenFiles, (req, res) => {
    try {
        console.log("📩 Upload Request Received at /upload");
        console.log("📑 Request Headers:", JSON.stringify(req.headers, null, 2));
        console.log("📝 Request Body (excluding files):", JSON.stringify(req.body, null, 2));
        console.log("📂 Files Received:", req.files ? JSON.stringify(Object.keys(req.files), null, 2) : "No files");

        if (!req.files || Object.keys(req.files).length === 0) {
            console.warn("⚠️ No files uploaded in request");
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        console.log("🔍 Processing uploaded files...");
        const fileUrls = {};
        ["beforeKaizenFiles", "afterKaizenFiles", "beforeKaizenDocs", "afterKaizenDocs"].forEach(field => {
            if (req.files[field]) {
                console.log(`📄 Mapping field: ${field} with ${req.files[field].length} file(s)`);
                fileUrls[field] = req.files[field].map(file => {
                    const url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
                    console.log(`  - File: ${file.originalname} -> ${url}`);
                    return url;
                });
            } else {
                console.log(`ℹ️ No files found for field: ${field}`);
            }
        });

        console.log("🌐 Generated File URLs:", JSON.stringify(fileUrls, null, 2));
        console.log("✅ Upload processing completed successfully");

        res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            fileUrls
        });
    } catch (error) {
        console.error("❌ File Upload Error:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            message: "File upload failed", 
            error: error.message 
        });
    }
});


module.exports = router;