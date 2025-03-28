const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Organization = require("../models/OrganizationLogo");

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, "../uploads/logos");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ⚡ Configure Multer (file upload middleware)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo_${Date.now()}${ext}`);
    }
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

// ✅ Upload Logo API
const uploadLogo = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        try {
            const logoPath = `/uploads/logos/${req.file.filename}`;
            const updatedOrg = await Organization.findOneAndUpdate(
                { _id: req.body.orgId }, 
                { logo: logoPath },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                message: "Logo uploaded successfully",
                logo: logoPath
            });
        } catch (error) {
            console.error("🚨 Error updating logo:", error);
            res.status(500).json({ success: false, message: "Server error", error: error.message });
        }
    });
};

// ✅ Get Logo API
const getLogo = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.orgId);
        if (!organization || !organization.logo) {
            return res.status(404).json({ success: false, message: "Logo not found" });
        }
        res.json({ success: true, logo: organization.logo });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { uploadLogo, getLogo };
