const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Ensure the "uploads" directory exists
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    console.log("📁 Creating uploads directory...");
    fs.mkdirSync(uploadDir, { recursive: true });
} else {
    console.log("✅ Uploads directory already exists.");
}

// Default allowed file types
const defaultAllowedTypes = ["image/jpeg", "image/png", "application/pdf"];

// Dynamic Multer configuration
const configureMulter = () => {
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
        },
    });

    const fileFilter = (req, file, cb) => {
        console.log(`🧐 Ascertain file type: ${file.mimetype}`);
        const allowedTypes = req.body.allowedTypes || defaultAllowedTypes;
        if (allowedTypes.includes(file.mimetype)) {
            console.log("✅ File type is valid.");
            cb(null, true);
        } else {
            console.error(`❌ Invalid file type: ${file.mimetype}`);
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(", ")}`), false);
        }
    };

    return multer({
        storage,
        fileFilter,
    }).fields([
        { name: "beforeKaizenFiles" },
        { name: "afterKaizenFiles" },
    ]);
};

// Middleware to handle dynamic uploads
const uploadKaizenFiles = (req, res, next) => {
    console.log("📩 Upload request received...");
    console.log("📑 Request Headers:", req.headers);

    const upload = configureMulter();

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error("❌ Multer Error:", err);
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            console.error("❌ Upload Error:", err);
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.files || (!req.files.beforeKaizenFiles && !req.files.afterKaizenFiles)) {
            console.warn("⚠️ No valid files uploaded.");
            return res.status(400).json({ success: false, message: "No valid files uploaded." });
        }

        console.log("📂 Files Uploaded:", Object.keys(req.files).map((field) => `${field}: ${req.files[field].length} files`));
        next();
    });
};

// Map file URLs to response
const mapFilesToFields = (req, res) => {
    try {
        console.log("📊 Mapping files to response...");
        const fileUrls = {};
        ["beforeKaizenFiles", "afterKaizenFiles"].forEach((field) => {
            if (req.files[field]) {
                fileUrls[field] = req.files[field].map(
                    (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
                );
            }
        });

        console.log("✅ Uploaded File URLs:", JSON.stringify(fileUrls, null, 2));
        res.status(200).json({
            success: true,
            message: "Files uploaded successfully.",
            fileUrls,
        });
    } catch (error) {
        console.error("❌ Error mapping files:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { uploadKaizenFiles, mapFilesToFields };