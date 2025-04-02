// controllers/qrCodeController.js
const express = require("express");
const QRCode = require("qrcode");
const router = express.Router();

// Plant configurations
const plantConfigs = {
    "1022": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "J-2 GGM" },
    "2014": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-5 GGM" },
    "1051": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "J-5 GGM" },
    "1031": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "J-3 MSR" },
    "2011": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-1 GGM" },
    "1513": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA FBD" },
    "2511": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMI" },
    "8021": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL NGH-1" },
    "2111": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-11 BLR" },
    "2211": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL HUB" },
    "2201": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL HSR" },
    "2221": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL PNG" },
    "2191": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL CHK" },
    "1571": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA IND-1" },
    "2041": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-8 HDW" },
    "1561": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA SND TML" },
    "2081": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-10 PNG" },
    "1681": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA CHK" },
    "1551": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA NSK" },
    "7011": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NIPL" },
    "2161": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL GGM" },
    "2132": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-14 VTP" },
    "2181": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL Waluj" },
    "1712": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "JBMA ORG-SSC" },
    "9211": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "ThirdEye AI" },
    "2071": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "N-7 MSR" },
    "1054": { "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo", "frGroupName": "NMPL SSC CHK" }
};

// Define the route to return a QR code as a buffer
router.get("/get-plant-qr", async (req, res) => {
    try {
        const { plantCode } = req.query;
        if (!plantCode || !plantConfigs[plantCode]) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing plantCode. Please provide a valid plantCode."
            });
        }
        const qrData = plantCode;

        // Generate QR code as a buffer
        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
            color: { dark: "#000000", light: "#FFFFFF" },
            width: 300
        });

        console.log(`✅ QR code buffer generated for plantCode: ${plantCode}`);

        // Set the response headers for an image
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", `inline; filename="qr-${plantCode}.png"`);

        // Send the buffer directly as the response
        res.send(qrCodeBuffer);
    } catch (error) {
        console.error("❌ Error generating QR code:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

module.exports = router;