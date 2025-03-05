const axios = require("axios");

const searchEmployeeByNameOrCode = async (req, res) => {
    console.log("🔄 Route hit: /search-employee");
    console.log("Query params received:", req.query);

    try {
        const { query } = req.query; // Accepting either name or employee code

        if (!query) {
            console.log("❌ No query provided");
            return res.status(400).json({ success: false, message: "Employee name or code is required for search." });
        }

        // ThirdEye API URL
        const apiUrl = "http://fr.thirdeye-ai.com/face/getEmpInfo?onlyId=1&frGroupName=ThirdEye%20AI&companyId=JBMGroup&frGroup=frAttendance";
        console.log("🔄 Sending request to ThirdEye API:", apiUrl);

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

        // Filter employees based on either name or employee code
        const matchingEmployees = employees.filter(emp =>
            emp.name.includes(lowerCaseQuery) || emp.employeeCode.includes(lowerCaseQuery)
        );

        console.log("🔍 Filtered employees:", matchingEmployees);

        res.status(200).json({ success: true, employees: matchingEmployees });
    } catch (error) {
        console.error("❌ Error fetching employees:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = { searchEmployeeByNameOrCode };
