const { setUploadSettings } = require("../utils/fileUploadSetting"); // Check this path
const ac = require("../rbac.js");
const updateUploadSettings = (req, res) => {
    try {
        console.log("📩 Received request to update upload settings");
        console.log("📝 Request Body:", JSON.stringify(req.body, null, 2));
        const { maxFileSize, maxFileCount } = req.body;
        const userRole = req.user?.role;

        console.log("👤 User Role:", userRole || "Not provided");
        if (!userRole) {
            console.warn("⚠️ No user role found in request");
            return res.status(401).json({ success: false, message: "Unauthorized: No user role found" });
        }

        const permission = ac.can(userRole).updateAny("uploadSettings");
        console.log("🔒 Permission Check:", { role: userRole, granted: permission.granted });
        if (!permission.granted) {
            console.warn(`🚫 ${userRole} lacks permission to update upload settings`);
            return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
        }

        if (!maxFileSize || !maxFileCount) {
            console.warn("⚠️ Missing required fields in request body");
            return res.status(400).json({ success: false, message: "maxFileSize and maxFileCount are required" });
        }
        if (typeof maxFileSize !== "number" || maxFileSize <= 0) {
            console.warn("⚠️ Invalid maxFileSize:", maxFileSize);
            return res.status(400).json({ success: false, message: "maxFileSize must be a positive number" });
        }
        if (typeof maxFileCount !== "number" || maxFileCount <= 0) {
            console.warn("⚠️ Invalid maxFileCount:", maxFileCount);
            return res.status(400).json({ success: false, message: "maxFileCount must be a positive number" });
        }

        setUploadSettings(maxFileSize, maxFileCount); // This should now work
        console.log("✅ Upload settings updated:", { maxFileSize, maxFileCount });

        res.status(200).json({
            success: true,
            message: "Upload settings updated successfully",
            settings: { maxFileSize, maxFileCount },
        });
    } catch (error) {
        console.error("❌ Error updating upload settings:", {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { updateUploadSettings };