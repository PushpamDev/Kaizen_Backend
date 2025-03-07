const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load config.json dynamically
const configPath = path.join(__dirname, "../config/config.json");
const plantConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const verifyEmployee = async (req, res) => {
    try {
        console.log("Received query parameters:", req.query);

        const plantCode = req.query.plantCode;
        const empId = req.query.empId || req.query.empID;

        if (!plantCode || !empId) {
            return res.status(400).json({ message: "Missing parameters: plantCode and empId are required." });
        }

        const plantData = plantConfig[plantCode];
        if (!plantData) {
            return res.status(400).json({ message: `Invalid plant code: ${plantCode}` });
        }

        const { apiUrl, frGroupName } = plantData;

        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const startDate = `${today}T00:00:00.001Z`;  // Correct timestamp format
        const endDate = `${today}T23:59:59.999Z`;

        const fullApiUrl = `${apiUrl}?frGroupName=${encodeURIComponent(frGroupName)}&frGroup=frAttendance&startDate=${startDate}&endDate=${endDate}&empId=${empId}`;


        console.log("Calling API:", fullApiUrl);
        const response = await axios.get(fullApiUrl);
        console.log("API Response:", response.data);
        
        // Check if the response contains at least one object with a 'time' field
        const isPresent = Array.isArray(response.data) && response.data.some(record => record.time);
        
        res.json({
            empId,
            plantCode,
            status: isPresent ? "Present" : "Absent"
        });
    } catch (error) {
        console.error("Error verifying employee:", error.message);

        if (error.response) {
            console.error("API Error Response:", error.response.status, error.response.data);
            return res.status(error.response.status).json({
                error: "Attendance API error",
                details: error.response.data
            });
        }

        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

module.exports = verifyEmployee;
