const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow"); // Workflow Model
const { startApprovalProcess } = require("./ApprovalWorkflowController"); // Approval Workflow Controller
const { sendApprovalEmail } = require("../services/emailService"); // Email Service

const createKaizenIdea = async (req, res) => {
    console.log("📩 Received Request Body:", req.body);
    console.log("📂 Uploaded Files:", req.files);

    try {
        // ✅ Destructure request body safely
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
            benefits,
            implementationCost,
            benefitCostRatio,
            standardization,
            horizontalDeployment,
            beforeKaizenFiles = [],
            afterKaizenFiles = []
        } = req.body;

        // ✅ Validate required fields
        if (!suggesterName || !employeeCode || !category || !plantCode || !registrationNumber) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        console.log("✅ Mapped File URLs:", { beforeKaizenFiles, afterKaizenFiles });

        // ✅ Prevent duplicate entries
        const existingKaizen = await KaizenIdea.findOne({ registrationNumber });
        if (existingKaizen) {
            return res.status(409).json({ success: false, message: "A Kaizen idea with this registration number already exists." });
        }

        // ✅ Fetch the latest approval workflow
        const latestWorkflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });

        if (!latestWorkflow) {
            return res.status(400).json({ success: false, message: "No approval workflow found for this plant." });
        }

        // ✅ Get first step's approver(s)
        const firstApprover = latestWorkflow.steps?.[0]?.approverEmail || null;

        if (!firstApprover) {
            return res.status(400).json({ success: false, message: "No approver found for the first step in the workflow." });
        }

        // ✅ Ensure files are always stored as arrays
        const beforeKaizenFileList = Array.isArray(beforeKaizenFiles) ? beforeKaizenFiles : [beforeKaizenFiles];
        const afterKaizenFileList = Array.isArray(afterKaizenFiles) ? afterKaizenFiles : [afterKaizenFiles];

        // ✅ Create the Kaizen Idea
        const newKaizen = new KaizenIdea({
            suggesterName,
            employeeCode,
            plantCode,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber,
            description,
            category,
            problemStatement,
            benefits,
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
            currentApprover: firstApprover, // ✅ Assign first approver
            workflowVersion: latestWorkflow.version // ✅ Store workflow version
        });

        await newKaizen.save();

        // ✅ Start the approval process automatically
        await startApprovalProcess(registrationNumber, plantCode, suggesterName, newKaizen);

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

// ✅ Fetch All Kaizen Ideas with Filters, Sorting & Pagination
const getAllKaizenIdeas = async (req, res) => {
    try {
        const { status, category, startDate, endDate, sortBy, page = 1, limit = 10 } = req.query;

        const filter = {};

        // ✅ Filter by status
        if (status) filter.status = status;

        // ✅ Filter by category
        if (category) filter.category = category;

        // ✅ Filter by date range
        if (startDate && endDate) {
            filter.date = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }

        // ✅ Sorting
        const sortOption = sortBy ? { [sortBy]: 1 } : { createdAt: -1 };

        // ✅ Pagination
        const pageNumber = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        const ideas = await KaizenIdea.find(filter)
            .sort(sortOption)
            .skip((pageNumber - 1) * pageLimit)
            .limit(pageLimit)
            .lean();

        res.status(200).json({
            success: true,
            ideas,
            totalPages: Math.ceil(await KaizenIdea.countDocuments(filter) / pageLimit),
            currentPage: pageNumber,
        });
    } catch (error) {
        console.error("❌ Error fetching Kaizen ideas:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


const getKaizenIdeaByRegistrationNumber = async (req, res) => {
    try {
        const { registrationNumber } = req.query;
        if (!registrationNumber) {
            return res.status(400).json({ success: false, message: "Registration number is required" });
        }

        const idea = await KaizenIdea.findOne({ registrationNumber }).lean();
        if (!idea) {
            return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        }

        res.status(200).json({ success: true, idea });
    } catch (error) {
        console.error("❌ Server Error:", error.stack);
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
