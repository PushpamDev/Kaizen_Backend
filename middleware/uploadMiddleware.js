const multer = require("multer");
const path = require("path");

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Save files in the 'uploads' directory
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
        cb(new Error("Invalid file type. Only JPEG, PNG, and PDF files are allowed."), false);
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
    { name: "beforeKaizenFiles", maxCount: 5 },
    { name: "afterKaizenFiles", maxCount: 5 },
    { name: "beforeKaizenDocs", maxCount: 5 },
    { name: "afterKaizenDocs", maxCount: 5 }
]);

// Middleware to map file paths to request body
const mapFilesToFields = (req, res, next) => {
    if (req.files) {
        ["beforeKaizenFiles", "afterKaizenFiles", "beforeKaizenDocs", "afterKaizenDocs"].forEach(field => {
            if (req.files[field]) {
                req.body[field] = req.files[field].map(file => file.path);
            }
        });
    }
    next();
};

module.exports = { uploadKaizenFiles, mapFilesToFields };
