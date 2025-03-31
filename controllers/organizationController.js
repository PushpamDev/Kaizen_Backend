const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OrganizationLogo = require("../models/OrganizationLogo");
const { authMiddleware, enforcePlantCode } = require("../middleware/authMiddleware");

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, "../uploads/logos");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const plantCode = req.user.plantCode;
        console.log("Multer plantCode:", plantCode);
        cb(null, `logo_${plantCode}_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and WEBP files are allowed."));
        }
    }
}).single("logo"); // 'logo' should match the form-data key


// Upload Logo API
const uploadLogo = async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        try {
            const plantCode = req.user.plantCode;
            console.log("Upload plantCode:", plantCode);
            if (!plantCode) {
                return res.status(400).json({ success: false, message: "plantCode is required." });
            }

            const logoPath = `/uploads/logos/${req.file.filename}`;

            const updatedOrg = await OrganizationLogo.findOneAndUpdate(
                { plantCode },
                { logo: logoPath, contentType: req.file.mimetype },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                message: `Logo uploaded successfully for plant ${plantCode}`,
                logo: logoPath,
            });
        } catch (error) {
            console.error("🚨 Error updating logo:", error);
            fs.unlink(path.join(uploadDir, req.file.filename), (unlinkErr) => {
                if (unlinkErr) console.error("Failed to clean up file:", unlinkErr);
            });
            res.status(500).json({ success: false, message: "Server error", error: error.message });
        }
    });
};

// Get Logo API
const getLogo = async (req, res) => {
    try {
        const plantCode = req.user.plantCode;
        console.log("Get plantCode:", plantCode);
        if (!plantCode) {
            return res.status(400).json({ success: false, message: "plantCode is required." });
        }

        const organization = await OrganizationLogo.findOne({ plantCode });
        if (!organization || !organization.logo) {
            return res.status(404).json({ success: false, message: `No logo found for plant ${plantCode}` });
        }

        // Assuming your logos are stored in a public directory or cloud storage
        // Adjust the base URL according to your setup
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; // Use environment variable in production
        const logoUrl = `${baseUrl}/uploads/logos/${organization.logo}`; // Adjust path based on your storage structure

        res.json({ 
            success: true, 
            logo: {
                url: logoUrl,
                filename: organization.logo // Optional: include filename if needed
            }
        });
    } catch (error) {
        console.error("🚨 Error fetching logo:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
module.exports = {
    uploadLogo: [authMiddleware, enforcePlantCode, uploadLogo],
    getLogo: [authMiddleware, enforcePlantCode, getLogo],
};