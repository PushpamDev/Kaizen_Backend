const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow"); // Workflow Model
const { startApprovalProcess } = require("./ApprovalWorkflowController"); // Approval Workflow Controller
const { sendApprovalEmail } = require("../services/emailService"); // Email Service
const uploadMiddleware = require("../middleware/uploadMiddleware");

const createKaizenIdea = async (req, res) => {
    console.log("📩 Received Request Body:", req.body);
    console.log("📂 Uploaded Files:", req.files);

    try {
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
            beforeKaizenFiles,
            afterKaizenFiles
        } = req.body;

        if (!suggesterName || !employeeCode || !category) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        // ✅ Extract file paths correctly
        // const beforeKaizenFiles = req.files?.beforeKaizenFiles
        //     ? req.files.beforeKaizenFiles.map(file => `/uploads/${file.filename}`)
        //     : [];

        // const afterKaizenFiles = req.files?.afterKaizenFiles
        //     ? req.files.afterKaizenFiles.map(file => `/uploads/${file.filename}`)
        //     : [];

        console.log("✅ Mapped File URLs:", { beforeKaizenFiles, afterKaizenFiles });

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
            beforeKaizenFiles, // ✅ Ensure these fields are saved
            afterKaizenFiles,   // ✅ Ensure these fields are saved
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

        const sortOption = sortBy ? { [sortBy]: 1 } : { createdAt: -1 };
        const pageNumber = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        const ideas = await KaizenIdea.find(filter)
            .select(
                "suggesterName employeeCode plantCode implementerName implementerCode implementationDate date registrationNumber category problemStatement description beforeKaizenFiles afterKaizenFiles benefits implementationCost benefitCostRatio standardization horizontalDeployment status createdAt"
            )
            .sort(sortOption)
            .skip((pageNumber - 1) * pageLimit)
            .limit(pageLimit)
            .lean();

        // Construct full URLs for file paths
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const formattedIdeas = ideas.map(idea => ({
            ...idea,
            beforeKaizenFiles: idea.beforeKaizenFiles?.map(file => `${baseUrl}${file}`) || [],
            afterKaizenFiles: idea.afterKaizenFiles?.map(file => `${baseUrl}${file}`) || [],
        }));

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

        // Construct full URLs for file paths
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const formattedIdea = {
            ...idea,
            beforeKaizenFiles: idea.beforeKaizenFiles?.map(file => `${baseUrl}/uploads/${file}`) || [],
            afterKaizenFiles: idea.afterKaizenFiles?.map(file => `${baseUrl}/uploads/${file}`) || [],
        };

        console.log("🔗 Formatted File URLs:", formattedIdea.beforeKaizenFiles, formattedIdea.afterKaizenFiles);

        res.status(200).json({ success: true, idea: formattedIdea });
    } catch (error) {
        console.error("❌ Server Error:", error.stack);
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
