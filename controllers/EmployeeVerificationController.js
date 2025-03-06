const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load config.json dynamically
const configPath = path.join(__dirname, "../config/config.json");
const plantConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const verifyEmployee = async (req, res) => {
    try {
        console.log("Received query parameters:", req.query); // Debugging

        // Normalize parameter names
        const plantCode = req.query.plantCode;
        const empId = req.query.empId || req.query.empID; // Handle both empId & empID

        if (!plantCode || !empId) {
            return res.status(400).json({ message: "Missing parameters: plantCode and empId are required." });
        }

        // Get API URL & frGroupName from config.json
        const plantData = plantConfig[plantCode];

        if (!plantData) {
            return res.status(400).json({ message: `Invalid plant code: ${plantCode}` });
        }

        const { apiUrl, frGroupName } = plantData;

        // Generate startDate & endDate for today
        const today = new Date().toISOString().split("T")[0];
        const startDate = `${today}T00:00:00.001Z`;
        const endDate = `${today}T23:59:59.999Z`;

        // Construct full API URL
        const fullApiUrl = `${apiUrl}?frGroupName=${encodeURIComponent(frGroupName)}&frGroup=frAttendance&startDate=${startDate}&endDate=${endDate}&empId=${empId}`;

        console.log("Calling API:", fullApiUrl); // Debugging
        const response = await axios.get(fullApiUrl);
        console.log("API Response:", response.data);

        // Extract relevant data
        const attendanceRecords = response.data?.data || []; // Assuming `data` contains attendance records
        const isPresent = attendanceRecords.some(record => record.empId === empId); // Check if empId exists in response

        // Return filtered response
        res.json({
            empId,
            plantCode,
            status: isPresent ? "Present" : "Absent"
        });
    } catch (error) {
        console.error("Error verifying employee:", error.message);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

module.exports = verifyEmployee;
