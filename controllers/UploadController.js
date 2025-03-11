const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types (images & PDFs)
const allowedFileTypes = /jpeg|jpg|png|pdf/;

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // ✅ Save files in 'uploads/' directory
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase()); // ✅ Unique filename
    }
});

// File Filter for Validation
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedFileTypes.test(ext)) {
        return cb(new Error("Only images (jpg, png) and PDFs are allowed!"), false);
    }
    cb(null, true);
};

// Multer Middleware (Limit file size to 5MB, max 10 files)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).array("files", 10); // ✅ Change 'files' to match your frontend input name

// Upload File Controller
const uploadFiles = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        // Generate full file URLs dynamically
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            fileUrl: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`, // ✅ Full URL
            mimetype: file.mimetype,
            size: file.size
        }));

        res.status(200).json({ 
            success: true, 
            message: "Files uploaded successfully",
            files: uploadedFiles
        });
    });
};

// Export the controller
module.exports = { uploadFiles };
