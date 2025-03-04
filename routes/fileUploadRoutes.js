const express = require("express");
const router = express.Router();
const { uploadKaizenFiles, mapFilesToFields } = require("../middleware/uploadMiddleware");
const UploadController = require("../controllers/UploadController");

// Define the file upload route
router.post("/", uploadKaizenFiles, mapFilesToFields, UploadController.uploadFiles);

module.exports = router;
