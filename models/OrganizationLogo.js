const mongoose = require("mongoose");

const OrganizationLogoSchema = new mongoose.Schema({
    plantCode: {
        type: String,
        required: true,
        unique: true, // Ensures one logo per plantCode
    },
    logo: {
        type: String, // Stores file path (e.g., "/uploads/logos/logo_ABC123_123456789.png")
        required: true,
    },
    contentType: {
        type: String, // Stores MIME type (e.g., "image/png")
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now, // Tracks when the logo was uploaded
    },
});

module.exports = mongoose.model("OrganizationLogo", OrganizationLogoSchema);