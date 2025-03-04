const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files in 'uploads/' directory
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
    }
});

// File type validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and PDF files are allowed.`), false);
    }
};

// Multer upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Middleware to handle multiple file fields
const uploadKaizenFiles = upload.fields([
    { name: "beforeKaizenFiles", maxCount: 10 },
    { name: "afterKaizenFiles", maxCount: 10 },
    { name: "beforeKaizenDocs", maxCount: 10 },
    { name: "afterKaizenDocs", maxCount: 10 }
]);

// Middleware to map file URLs to request body
const mapFilesToFields = (req, res, next) => {
    try {
        if (req.files) {
            ["beforeKaizenFiles", "afterKaizenFiles", "beforeKaizenDocs", "afterKaizenDocs"].forEach(field => {
                if (req.files[field]) {
                    // Convert file paths to URLs
                    const fileUrls = req.files[field].map(file => `/uploads/${file.filename}`);
                    
                    // Assign URLs to request body fields
                    if (field === "beforeKaizenFiles") {
                        req.body.beforeKaizenFileUrls = fileUrls;
                    } else if (field === "afterKaizenFiles") {
                        req.body.afterKaizenFileUrls = fileUrls;
                    } else {
                        req.body[field] = fileUrls;
                    }
                }
            });
        }
        console.log("Uploaded File URLs:", req.body); // Debugging log
        next();
    } catch (error) {
        console.error("Error mapping files:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { uploadKaizenFiles, mapFilesToFields };
