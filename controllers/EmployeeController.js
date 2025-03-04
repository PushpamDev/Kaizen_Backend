const axios = require("axios");

const searchEmployeeByName = async (req, res) => {
    console.log("🔄 Route hit: /search-employee");
    console.log("Query params received:", req.query);

    try {
        const { suggesterName } = req.query;

        if (!suggesterName) {
            console.log("❌ No suggesterName provided");
            return res.status(400).json({ success: false, message: "Suggester name is required for search." });
        }

        // ThirdEye API URL
        const apiUrl = "http://fr.thirdeye-ai.com/face/getEmpInfo?onlyId=1&frGroupName=ThirdEye%20AI&companyId=JBMGroup&frGroup=frAttendance";
        console.log("🔄 Sending request to ThirdEye API:", apiUrl);

        // Make API request
        const response = await axios.get(apiUrl);

        console.log("✅ ThirdEye API Response Data:", response.data);

        // Ensure employeeInfo exists and is an array
        if (!response.data || !Array.isArray(response.data.employeeInfo)) {
            console.error("❌ API response format is incorrect:", response.data);
            return res.status(500).json({ success: false, message: "Invalid API response format", data: response.data });
        }

        // Process Employees
        const employees = response.data.employeeInfo.map(emp => {
            let extractedName = emp.empId.includes("Contractual@") 
                ? emp.empId.replace("Contractual@", "").split("_")[0] 
                : emp.empId.split("_")[0];

            let extractedId = emp.empId.split("_")[1];

            return {
                name: extractedName,
                employeeCode: extractedId,
                designation: emp.designation || "Unknown", 
                department: emp.department || "Unknown"
            };
        });

        // Filter employees based on name
        const matchingEmployees = employees.filter(emp =>
            emp.name.toLowerCase().includes(suggesterName.toLowerCase())
        );

        console.log("🔍 Filtered employees:", matchingEmployees);

        res.status(200).json({ success: true, employees: matchingEmployees });
    } catch (error) {
        console.error("❌ Error fetching employees:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { searchEmployeeByName };
