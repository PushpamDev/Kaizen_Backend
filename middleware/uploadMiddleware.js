const multer = require("multer");

// Define the allowed MIME types for files
const allowedMimeTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp",  // Image formats
  "application/pdf",  // PDF files
  "application/vnd.ms-powerpoint",  // PowerPoint files (older version)
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",  // PowerPoint files (new version)
];

// Define the storage strategy (memory storage in this case)
const storage = multer.memoryStorage(); // Files are stored in memory before processing

// Define the upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
  fileFilter: (req, file, cb) => {
    // Check if the file type is allowed
    if (file && !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only image, PDF, and PowerPoint files are allowed!"), false);
    }
    cb(null, true);  // Accept the file
  },
}).fields([
  { name: 'beforeKaizenFiles', maxCount: 5 },
  { name: 'afterKaizenFiles', maxCount: 5 },
]);

// Custom middleware to map files to the correct fields
const mapFilesToFields = (req, res, next) => {
    // Map files to fields if they exist
    req.body.beforeKaizenFiles = req.files["beforeKaizenFiles"] || [];
    req.body.afterKaizenFiles = req.files["afterKaizenFiles"] || [];
    req.body.beforeKaizenDocs = req.files["beforeKaizenDocs"] || [];
    req.body.afterKaizenDocs = req.files["afterKaizenDocs"] || [];
  
    next();
  };
  

// Export the middleware
module.exports = {
  uploadKaizenFiles: upload,
  mapFilesToFields,
};
