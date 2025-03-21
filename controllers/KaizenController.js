const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const { startApprovalProcess } = require("./ApprovalWorkflowController");

// ✅ Create Kaizen Idea with validation and optimized workflow handling
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
            registrationNumber,
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

        // ✅ Convert registrationNumber to lowercase for case-insensitive uniqueness
        const normalizedRegNum = registrationNumber.trim().toLowerCase();

        // ✅ Validate required fields
        if (!suggesterName || !employeeCode || !category || !plantCode || !normalizedRegNum) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        // ✅ Prevent duplicate entries
        const existingKaizen = await KaizenIdea.findOne({ registrationNumber: normalizedRegNum });
        if (existingKaizen) {
            return res.status(409).json({ success: false, message: "Kaizen idea with this registration number already exists." });
        }

        // ✅ Fetch latest workflow for the plant
        const latestWorkflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
        if (!latestWorkflow) {
            return res.status(400).json({ success: false, message: "No approval workflow found for this plant." });
        }

        // ✅ Get first stage approvers
        const firstApprovers = latestWorkflow.steps?.[0]?.approverEmails || [];

        if (!firstApprovers.length) {
            return res.status(400).json({ success: false, message: "No approvers assigned for the first step." });
        }

        // ✅ Ensure file paths are stored as arrays
        const beforeKaizenFileList = Array.isArray(beforeKaizenFiles) ? beforeKaizenFiles : [beforeKaizenFiles];
        const afterKaizenFileList = Array.isArray(afterKaizenFiles) ? afterKaizenFiles : [afterKaizenFiles];

        // ✅ Create the new Kaizen idea
        const newKaizen = new KaizenIdea({
            suggesterName,
            employeeCode,
            plantCode,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber: normalizedRegNum, // ✅ Store in lowercase
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
            currentApprovers: firstApprovers, // ✅ Store as an array
            workflowVersion: latestWorkflow.version
        });

        await newKaizen.save();

        // ✅ Start the approval process
        await startApprovalProcess(normalizedRegNum, plantCode, suggesterName, newKaizen);

        res.status(201).json({
            success: true,
            message: "Kaizen idea created successfully and approval workflow started.",
            kaizen: newKaizen
        });
    } catch (error) {
        console.error("❌ Error creating Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Fetch all Kaizen Ideas with optimized filters, sorting & pagination
const getAllKaizenIdeas = async (req, res) => {
    try {
        const { status, category, startDate, endDate, sortBy = "createdAt", page = 1, limit = 10 } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = new RegExp(category, "i"); // ✅ Case-insensitive search

        // ✅ Validate date filters
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date("1970-01-01");
            const end = endDate ? new Date(endDate) : new Date();
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid date format" });
            }
            filter.date = { $gte: start, $lte: end };
        }

        // ✅ Sorting & Pagination
        const pageNumber = Math.max(1, Number(page));
        const pageLimit = Math.max(1, Number(limit));
        const sortOption = { [sortBy]: -1 };

        // ✅ Fetch paginated data and total count separately for performance
        const [ideas, totalCount] = await Promise.all([
            KaizenIdea.find(filter).sort(sortOption).skip((pageNumber - 1) * pageLimit).limit(pageLimit).lean(),
            KaizenIdea.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            ideas,
            totalPages: Math.ceil(totalCount / pageLimit),
            currentPage: pageNumber,
            totalCount
        });
    } catch (error) {
        console.error("❌ Error fetching Kaizen ideas:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Get Kaizen Idea by Registration Number (case-insensitive)
const getKaizenIdeaByRegistrationNumber = async (req, res) => {
    try {
        const { registrationNumber } = req.query;
        if (!registrationNumber) {
            return res.status(400).json({ success: false, message: "Registration number is required" });
        }

        const normalizedRegNum = registrationNumber.trim().toLowerCase();
        const idea = await KaizenIdea.findOne({ registrationNumber: normalizedRegNum }).lean();
        if (!idea) {
            return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        }

        res.status(200).json({ success: true, idea });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

const updateKaizenIdea = async (req, res) => {
    try {
        const updatedIdea = await KaizenIdea.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });

        res.status(200).json({ success: true, message: "Kaizen idea updated successfully", updatedIdea });
    } catch (error) {
        console.error("❌ Error updating Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

const deleteKaizenIdea = async (req, res) => {
    try {
        const deletedIdea = await KaizenIdea.findByIdAndDelete(req.params.id);
        if (!deletedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });

        res.status(200).json({ success: true, message: "Kaizen idea deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 📌 Fetch Kaizen ideas by status
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
    getIdeasByStatus
};