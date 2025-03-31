const mongoose = require("mongoose");

const fileSettingsSchema = new mongoose.Schema({
    plantCode: { type: String, required: true, unique: true },
    maxFileSize: { type: Number, required: true },
    maxFileCount: { type: Number, required: true },
    allowedFileTypes: { type: [String], required: true }
}, { timestamps: true });

const FileSettings = mongoose.model("FileSettings", fileSettingsSchema);

module.exports = FileSettings;
