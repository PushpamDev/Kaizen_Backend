const mongoose = require("mongoose");

const OrganizationLogoSchema = new mongoose.Schema({
    logo: {
        type: Buffer, // Stores image binary data
        required: true,
    },
    contentType: {
        type: String, // Stores MIME type (e.g., "image/png")
        required: true,
    },
});

module.exports = mongoose.model("OrganizationLogo", OrganizationLogoSchema);
