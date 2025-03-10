const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow"); // Workflow Model
const { startApprovalProcess } = require("./ApprovalWorkflowController"); // Approval Workflow Controller
const { sendApprovalEmail } = require("../services/emailService"); // Email Service

// ✅ Create Kaizen Idea with File Uploads & Approval Workflow
const createKaizenIdea = async (req, res) => {
    console.log("📩 Received Request Body:", req.body);

    try {
        const {
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
            standardization,
            horizontalDeployment
        } = req.body;

        if (!suggesterName || !employeeCode || !category) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        // ✅ Handle file uploads
        const beforeKaizenFiles = req.body.beforeKaizenFileUrls || [];
        const afterKaizenFiles = req.body.afterKaizenFileUrls || [];

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
            standardization,
            horizontalDeployment,
            beforeKaizenFiles,
            afterKaizenFiles,
            isApproved: false,
            status: "Pending",
            currentStage: 0,
            currentApprover: "",
            stages: []
        });

        await newKaizen.save();

        // ✅ Start the approval process automatically
        await startApprovalProcess(registrationNumber, plantCode, suggesterName, newKaizen);

        res.status(201).json({ success: true, message: "Kaizen idea created successfully.", kaizen: newKaizen });
    } catch (error) {
        console.error("❌ Error creating Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Get All Kaizen Ideas with Filtering, Sorting & Pagination
const getAllKaizenIdeas = async (req, res) => {
    try {
        const { status, category, sortBy, page = 1, limit = 10 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const sortOption = sortBy ? { [sortBy]: 1 } : { createdAt: -1 }; // Default: Newest first
        const pageNumber = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        const ideas = await KaizenIdea.find(filter)
            .select(
                "suggesterName employeeCode plantCode implementerName implementerCode implementationDate date registrationNumber category otherCategory problemStatement description beforeKaizenFiles afterKaizenFiles benefits implementationCost benefitCostRatio standardization horizontalDeployment status createdAt"
            )
            .sort(sortOption)
            .skip((pageNumber - 1) * pageLimit) 
            .limit(pageLimit)
            .lean(); // Converts Mongoose docs to plain objects

        // Ensure missing fields return as `null`
        const formattedIdeas = ideas.map(idea => ({
            suggesterName: idea.suggesterName || null,
            employeeCode: idea.employeeCode || null,
            plantCode: idea.plantCode || null,
            implementerName: idea.implementerName || null,
            implementerCode: idea.implementerCode || null,
            implementationDate: idea.implementationDate || null,
            date: idea.date || null,
            registrationNumber: idea.registrationNumber || null,
            category: idea.category || null,
            otherCategory: idea.otherCategory || null,
            problemStatement: idea.problemStatement || null,
            description: idea.description || null,
            beforeKaizenFiles: idea.beforeKaizenFiles || [],
            afterKaizenFiles: idea.afterKaizenFiles || [],
            benefits: idea.benefits || null,
            implementationCost: idea.implementationCost || 0,
            benefitCostRatio: idea.benefitCostRatio || 0,
            standardization: idea.standardization || null,
            horizontalDeployment: idea.horizontalDeployment || null,
            status: idea.status || "Pending",
            createdAt: idea.createdAt || null,
            _id: idea._id,
        }));

        // Get total count for pagination
        const totalIdeas = await KaizenIdea.countDocuments(filter);

        res.status(200).json({
            success: true,
            ideas: formattedIdeas,
            totalPages: Math.ceil(totalIdeas / pageLimit),
            currentPage: pageNumber,
        });
    } catch (error) {
        console.error("❌ Error fetching Kaizen ideas:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Get Kaizen Idea by Registration Number
const getKaizenIdeaByRegistrationNumber = async (req, res) => {
    try {
        const { registrationNumber } = req.query;

        if (!registrationNumber) {
            return res.status(400).json({ success: false, message: "Registration number is required" });
        }

        const idea = await KaizenIdea.findOne({ registrationNumber });

        if (!idea) {
            return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        }

        res.status(200).json({
            success: true,
            idea: {
                ...idea.toObject(),
                beforeKaizenFiles: idea.beforeKaizenFiles || [],
                afterKaizenFiles: idea.afterKaizenFiles || []
            }
        });
    } catch (error) {
        console.error("❌ Server Error:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// ✅ Update Kaizen Idea
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

// ✅ Delete Kaizen Idea
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

module.exports = {
    createKaizenIdea,
    getAllKaizenIdeas,
    getKaizenIdeaByRegistrationNumber,
    updateKaizenIdea,
    deleteKaizenIdea
};
