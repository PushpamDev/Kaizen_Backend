const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const { startApprovalProcess } = require("./ApprovalWorkflowController");

// Generate a unique registration number
const generateRegistrationNumber = async (req, res) => {
    try {
        const { plantCode } = req.body;
        if (!plantCode) {
            console.warn("⚠️ Missing plantCode in request body");
            return res.status(400).json({ success: false, message: "plantCode is required" });
        }

        // Format date as YYYYMMDD
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ""); // e.g., "20250328"

        // Find the last Kaizen idea for this plantCode and date to determine the serial number
        const lastKaizen = await KaizenIdea.findOne({
            plantCode,
            registrationNumber: { $regex: `^${plantCode}${dateStr}` }
        }).sort({ registrationNumber: -1 });

        let serialNumber = 1;
        if (lastKaizen) {
            const lastRegNum = lastKaizen.registrationNumber;
            const lastSerial = parseInt(lastRegNum.slice(plantCode.length + dateStr.length), 10);
            serialNumber = lastSerial + 1;
        }

        // Pad serial number to 3 digits (e.g., 001)
        const paddedSerial = String(serialNumber).padStart(3, "0");

        // Combine plantCode, date, and serialNumber
        const registrationNumber = `${plantCode}${dateStr}${paddedSerial}`;
        console.log("🔢 Generated Registration Number:", registrationNumber);

        res.status(200).json({ success: true, registrationNumber });
    } catch (error) {
        console.error("❌ Error generating registration number:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Create a new Kaizen Idea (using registrationNumber from frontend)
const createKaizenIdea = async (req, res) => {
    try {
        console.log("📩 Received Request:", req.body);

        const {
            suggesterName,
            employeeCode,
            plantCode,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber, // Now required from frontend
            beforeKaizen,
            afterKaizen,
            description,
            category,
            problemStatement,
            tangibleBenefits,
            intangibleBenefits,
            implementationCost,
            benefitCostRatio,
            standardization,
            horizontalDeployment,
            beforeKaizenFiles = [],
            afterKaizenFiles = []
        } = req.body;

        // Validate required fields
        if (!suggesterName || !employeeCode || !category || !plantCode || !registrationNumber) {
            console.warn("⚠️ Missing required fields:", { suggesterName, employeeCode, category, plantCode, registrationNumber });
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        // Normalize registrationNumber
        const normalizedRegNum = typeof registrationNumber === "string" 
            ? registrationNumber.trim().toLowerCase() 
            : String(registrationNumber).trim().toLowerCase();

        if (!normalizedRegNum) {
            console.warn("⚠️ Invalid registrationNumber: Empty after normalization");
            return res.status(400).json({ success: false, message: "Registration number cannot be empty." });
        }

        // Prevent duplicate entries
        const existingKaizen = await KaizenIdea.findOne({ registrationNumber: normalizedRegNum });
        if (existingKaizen) {
            console.warn("⚠️ Duplicate registrationNumber:", normalizedRegNum);
            return res.status(409).json({ success: false, message: "Kaizen idea with this registration number already exists." });
        }

        // Fetch the latest workflow for the plant
        const latestWorkflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
        if (!latestWorkflow) {
            console.warn("⚠️ No workflow found for plantCode:", plantCode);
            return res.status(400).json({ success: false, message: "No approval workflow found for this plant." });
        }

        console.log("✅ Latest workflow found:", latestWorkflow);

        // Get first stage approvers
        const firstApprovers = latestWorkflow.steps?.[0]?.approverEmails || [];
        if (!firstApprovers.length) {
            console.warn("⚠️ No approvers assigned for first step in workflow:", latestWorkflow);
            return res.status(400).json({ success: false, message: "No approvers assigned for the first step." });
        }

        // Ensure file paths are stored as arrays
        const beforeKaizenFileList = Array.isArray(beforeKaizenFiles) ? beforeKaizenFiles : [beforeKaizenFiles].filter(Boolean);
        const afterKaizenFileList = Array.isArray(afterKaizenFiles) ? afterKaizenFiles : [afterKaizenFiles].filter(Boolean);

        // Create the new Kaizen idea
        const newKaizen = new KaizenIdea({
            suggesterName,
            employeeCode,
            plantCode,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber: normalizedRegNum,
            description,
            category,
            problemStatement,
            tangibleBenefits,
            intangibleBenefits,
            implementationCost,
            benefitCostRatio,
            beforeKaizen,
            afterKaizen,
            standardization,
            horizontalDeployment,
            beforeKaizenFiles: beforeKaizenFileList,
            afterKaizenFiles: afterKaizenFileList,
            isApproved: false,
            status: "Pending Approval",
            currentStage: 0,
            currentApprovers: firstApprovers,
            workflowVersion: latestWorkflow.version
        });

        await newKaizen.save();
        console.log("✅ Kaizen idea saved:", newKaizen._id);

        // Start the approval process
        await startApprovalProcess(normalizedRegNum, plantCode, suggesterName, newKaizen);
        console.log("✅ Approval process started for:", normalizedRegNum);

        res.status(201).json({
            success: true,
            message: "Kaizen idea created successfully and approval workflow started.",
            kaizen: newKaizen
        });
    } catch (error) {
        console.error("❌ Error creating Kaizen idea:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


// Fetch all Kaizen Ideas
const getAllKaizenIdeas = async (req, res) => {
    try {
        const { status, category, startDate, endDate, sortBy = "createdAt" } = req.query;

        // Initialize filters based on user role
        let filter = {};
        
        if (req.user.role === "admin") {
            // Super admin sees all Kaizen ideas for their plant
            if (!req.user.plantCode) {
                console.warn("⚠️ admin has no plantCode assigned");
                return res.status(400).json({ success: false, message: "Super admin must be associated with a plant" });
            }
            filter.plantCode = req.user.plantCode;
            console.log("🔍 admin filter applied:", JSON.stringify(filter, null, 2));
        } else {
            // Non-super admin users see only ideas where they are current approvers
            filter.plantCode = req.user.plantCode;
            filter.currentApprovers = req.user.email;
            console.log("🔍 Non-admin filter applied:", JSON.stringify(filter, null, 2));
        }

        // Apply additional filters if provided
        if (status) {
            filter.status = status;
            console.log("🔧 Added status filter:", status);
        }
        if (category) {
            filter.category = new RegExp(category, "i"); // Case-insensitive search
            console.log("🔧 Added category filter:", category);
        }

        // Date filtering
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date("1970-01-01");
            const end = endDate ? new Date(endDate) : new Date();
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn("⚠️ Invalid date format:", { startDate, endDate });
                return res.status(400).json({ success: false, message: "Invalid date format" });
            }
            filter.createdAt = { $gte: start, $lte: end };
            console.log("🔧 Added date filter:", { start, end });
        }

        // Sorting
        const sortOption = { [sortBy]: -1 }; // Default descending order
        console.log("📏 Sorting by:", sortBy);

        // Fetch all data and count
        const [ideas, totalCount] = await Promise.all([
            KaizenIdea.find(filter).sort(sortOption).lean(),
            KaizenIdea.countDocuments(filter)
        ]);

        console.log("✅ Retrieved ideas:", ideas.length, "Total count:", totalCount);

        res.status(200).json({
            success: true,
            ideas,
            totalCount
        });
    } catch (error) {
        console.error("🔥 Error fetching Kaizen ideas:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
// Get Kaizen Idea by Registration Number (case-insensitive)
const getKaizenIdeaByRegistrationNumber = async (req, res) => {
    try {
        const { registrationNumber } = req.query;
        if (!registrationNumber) {
            console.warn("⚠️ Registration number missing in query");
            return res.status(400).json({ success: false, message: "Registration number is required" });
        }

        // Ensure registrationNumber is a string and normalize it
        const normalizedRegNum = typeof registrationNumber === "string" 
            ? registrationNumber.trim().toLowerCase() 
            : String(registrationNumber || "").trim().toLowerCase();

        if (!normalizedRegNum) {
            console.warn("⚠️ Invalid registrationNumber: Empty after normalization");
            return res.status(400).json({ success: false, message: "Registration number cannot be empty." });
        }

        // Initialize filter based on user role
        let filter = {};
        
        if (req.user.role === "admin") {
            // Super admin sees Kaizen ideas only for their plant
            if (!req.user.plantCode) {
                console.warn("⚠️ Super admin has no plantCode assigned");
                return res.status(400).json({ success: false, message: "Super admin must be associated with a plant" });
            }
            filter.plantCode = req.user.plantCode;
            console.log("🔍 admin filter applied:", JSON.stringify(filter, null, 2));
        } else {
            // Non-super admin users see only ideas where they are current approvers
            filter.plantCode = req.user.plantCode;
            console.log("🔍 Non-admin filter applied:", JSON.stringify(filter, null, 2));
        }

        // Search for the Kaizen idea
        const idea = await KaizenIdea.findOne({ registrationNumber: normalizedRegNum, ...filter }).lean();
        if (!idea) {
            console.warn("⚠️ Kaizen idea not found for:", normalizedRegNum);
            return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        }

        // Check authorization for non-super admins
        const userEmail = req.user.email; // Assuming req.user.email is set by your auth middleware
        if (req.user.role !== "admin" && !idea.currentApprovers.includes(userEmail)) {
            console.warn("⚠️ Unauthorized access attempt by:", userEmail);
            return res.status(403).json({ 
                success: false, 
                message: "You are not authorized to view this Kaizen idea at this stage" 
            });
        }

        console.log("✅ Found Kaizen idea:", idea._id);
        res.status(200).json({ success: true, idea });
    } catch (error) {
        console.error("🔥 Server Error:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
//Update a Kaizen Idea
const updateKaizenIdea = async (req, res) => {
    try {
        const updatedIdea = await KaizenIdea.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });

        res.status(200).json({ success: true, message: "Kaizen idea updated successfully", updatedIdea });
    } catch (error) {
        console.error("Error updating Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

const deleteKaizenIdea = async (req, res) => {
    try {
        const deletedIdea = await KaizenIdea.findByIdAndDelete(req.params.id);
        if (!deletedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });

        res.status(200).json({ success: true, message: "Kaizen idea deleted successfully" });
    } catch (error) {
        console.error(" Error deleting Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Fetch Kaizen ideas by status
const getIdeasByStatus = async (req, res) => {
    try {
        const { status } = req.query;
        if (!status) return res.status(400).json({ message: "Status parameter is required." });

        const validStatuses = ["Approved", "Pending Approval", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status provided." });
        }

        const ideas = await KaizenIdea.find({ status });
        res.status(200).json(ideas);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ideas", error: error.message });
    }
};

module.exports = {
    createKaizenIdea,
    getAllKaizenIdeas,
    getKaizenIdeaByRegistrationNumber,
    updateKaizenIdea,
    deleteKaizenIdea,
    generateRegistrationNumber,
    getIdeasByStatus
};
