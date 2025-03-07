const axios = require("axios");

// Configuration for different plant API URLs and group names
const plantConfigs = {
    "1022": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "J-2 GGM"
    },
    "2014": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-5 GGM"
    },
    "1051": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "J-5 GGM"
    },
    "1031": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "J-3 MSR"
    },
    "2011": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-1 GGM"
    },
    "1513": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA FBD"
    },
    "2511": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMI"
    },
    "8021": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL NGH-1"
    },
    "2111": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-11 BLR"
    },
    "2211": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL HUB"
    },
    "2201": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL HSR"
    },
    "2221": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL PNG"
    },
    "2191": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL CHK"
    },
    "1571": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA IND-1"
    },
    "2041": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-8 HDW"
    },
    "1561": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA SND TML"
    },
    "2081": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-10 PNG"
    },
    "1681": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA CHK"
    },
    "1551": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA NSK"
    },
    "7011": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NIPL"
    },
    "2161": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL GGM"
    },
    "2132": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "N-14 VTP"
    },
    "2181": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL Waluj"
    },
    "1712": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "JBMA ORG-SSC"
    },
    "9211": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "ThirdEye AI"
    },
    "1054": {
        "apiUrl": "http://fr.thirdeye-ai.com/face/getEmpInfo",
        "frGroupName": "NMPL SSC CHK"
    }
};

const searchEmployeeByNameOrCode = async (req, res) => {
    console.log("🔄 Route hit: /search-employee");
    console.log("Query params received:", req.query);

    try {
        const { query, plantCode } = req.query; // Accept name OR employee code

        if (!query) {
            console.log("❌ No query provided");
            return res.status(400).json({ success: false, message: "Employee name or code is required for search." });
        }

        // Get plant-specific API details, defaulting to "ThirdEye AI" if plantCode is missing or invalid
        const plantConfig = plantConfigs[plantCode] || plantConfigs["9211"];
        const apiUrl = `${plantConfig.apiUrl}?onlyId=1&frGroupName=${encodeURIComponent(plantConfig.frGroupName)}&companyId=JBMGroup&frGroup=frAttendance`;

        console.log(`🔄 Sending request to ThirdEye API (${plantConfig.frGroupName}):`, apiUrl);

        // Make API request
        const response = await axios.get(apiUrl);

        console.log("✅ ThirdEye API Response Data received.");

        // Ensure API response is valid
        if (!response.data || !Array.isArray(response.data.employeeInfo)) {
            console.error("❌ API response format is incorrect:", response.data);
            return res.status(500).json({ success: false, message: "Invalid API response format", data: response.data });
        }

        const employeeInfo = response.data.employeeInfo;

        // Process Employees
        const employees = employeeInfo.map(emp => {
            if (!emp.empId) return null; // Skip invalid entries

            let extractedName = emp.empId.includes("Contractual@") 
                ? emp.empId.replace("Contractual@", "").split("_")[0] 
                : emp.empId.split("_")[0];

            let extractedId = emp.empId.split("_")[1] || "Unknown";

            return {
                name: extractedName.toLowerCase(),  // Convert to lowercase for case-insensitive search
                employeeCode: extractedId.toLowerCase(),
                designation: emp.designation || "Unknown", 
                department: emp.department || "Unknown"
            };
        }).filter(emp => emp !== null); // Remove null entries

        // Convert query to lowercase for case-insensitive search
        const lowerCaseQuery = query.toLowerCase();

        // Search employees by either name or employee code
        const matchingEmployees = employees.filter(emp =>
            emp.name.includes(lowerCaseQuery) || emp.employeeCode.includes(lowerCaseQuery)
        );

        // If no match found, return message
        if (matchingEmployees.length === 0) {
            console.log("❌ No employees found for query:", query);
            return res.status(404).json({ success: false, message: "No employee found with the given details." });
        }

        console.log("🔍 Filtered employees:", matchingEmployees);

        res.status(200).json({ success: true, employees: matchingEmployees });
    } catch (error) {
        console.error("❌ Error fetching employees:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { searchEmployeeByNameOrCode };
