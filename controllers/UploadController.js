const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types (images, PDFs, etc.)
const allowedFileTypes = /jpeg|jpg|png|pdf|txt|docx|xlsx/;

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save files in 'uploads/' directory
    },
    filename: function (req, file, cb) {
        const ext = file.originalname ? path.extname(file.originalname).toLowerCase() : ".bin"; // Default extension if undefined
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + ext); // Ensure filename is always set
    }
});

// File Filter for Validation
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedFileTypes.test(ext)) {
        return cb(new Error("Only images (jpg, png), PDFs, and other allowed file types are allowed!"), false);
    }
    cb(null, true);
};

// Multer Middleware (No size limits or max count)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
}).fields([
    { name: "beforeKaizenFiles" },
    { name: "afterKaizenFiles" }
]);

// Upload File Controller
const uploadFiles = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No valid files uploaded." });
        }

        // Correctly map files per field
        const uploadedFiles = {};
        Object.keys(req.files).forEach(field => {
            uploadedFiles[field] = req.files[field].map(file => ({
                filename: file.filename,
                fileUrl: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size
            }));
        });

        res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            fileUrls: uploadedFiles
        });
    });
};

// Export the controller
module.exports = { uploadFiles };