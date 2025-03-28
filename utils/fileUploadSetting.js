// In-memory storage for simplicity (replace with a database like MongoDB for persistence)
let uploadSettings = {
    maxFileSize: 5 * 1024 * 1024, // Default: 5MB
    maxFileCount: 10, // Default: 10 files per field
};

// Function to update settings
const setUploadSettings = (maxFileSize, maxFileCount) => {
    if (maxFileSize && typeof maxFileSize === "number" && maxFileSize > 0) {
        uploadSettings.maxFileSize = maxFileSize;
    }
    if (maxFileCount && typeof maxFileCount === "number" && maxFileCount > 0) {
        uploadSettings.maxFileCount = maxFileCount;
    }
    console.log("✅ Updated upload settings:", uploadSettings);
};

// Function to get current settings
const getUploadSettings = () => uploadSettings;

module.exports = { setUploadSettings, getUploadSettings };