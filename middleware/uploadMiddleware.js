const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // Load environment variables

// Ensure the "uploads" directory exists
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    console.log("📁 Creating uploads directory...");
    fs.mkdirSync(uploadDir, { recursive: true });
} else {
    console.log("✅ Uploads directory already exists.");
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`📂 Storing file: ${file.originalname} in ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const newFilename = uniqueSuffix + path.extname(file.originalname);
        console.log(`📄 Generated filename: ${newFilename}`);
        cb(null, newFilename);
    }
});

// File type validation
const fileFilter = (req, file, cb) => {
    console.log(`🧐 Validating file type: ${file.mimetype}`);
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        console.log("✅ File type is valid.");
        cb(null, true);
    } else {
        console.error(`❌ Invalid file type: ${file.mimetype}`);
        return cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and PDF files are allowed.`), false);
    }
};

// Multer upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Middleware to handle only `beforeKaizenFiles` and `afterKaizenFiles`
const uploadKaizenFiles = (req, res, next) => {
    console.log("📩 Upload request received...");
    console.log("📑 Request Headers:", req.headers);

    upload.fields([
        { name: "beforeKaizenFiles", maxCount: 10 },
        { name: "afterKaizenFiles", maxCount: 10 }
    ])(req, res, function (err) {
        if (err) {
            console.error("❌ Multer Error:", err);
            return res.status(400).json({ success: false, message: "File upload error", error: err.message });
        }

        if (!req.files || (!req.files.beforeKaizenFiles && !req.files.afterKaizenFiles)) {
            console.warn("⚠️ No files uploaded.");
            return res.status(400).json({ success: false, message: "No valid files uploaded." });
        }

        console.log("📂 Files Uploaded:", Object.keys(req.files).map(field => `${field}: ${req.files[field].length} files`));
        
        next();
    });
};

// Middleware to map file URLs to response
const mapFilesToFields = (req, res) => {
    try {
        console.log("📊 Mapping files to response...");

        if (!req.files || (!req.files.beforeKaizenFiles && !req.files.afterKaizenFiles)) {
            console.warn("⚠️ No files uploaded.");
            return res.status(400).json({ success: false, message: "No files uploaded." });
        }

        const fileUrls = {};
        ["beforeKaizenFiles", "afterKaizenFiles"].forEach(field => {
            if (req.files[field]) {
                fileUrls[field] = req.files[field].map(file => 
                    `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
                );
            }
        });

        console.log("✅ Uploaded File URLs:", JSON.stringify(fileUrls, null, 2));

        res.status(200).json({
            success: true,
            message: "Files uploaded successfully.",
            fileUrls
        });
    } catch (error) {
        console.error("❌ Error mapping files:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { uploadKaizenFiles, mapFilesToFields };
