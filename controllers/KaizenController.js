const KaizenIdea = require("../models/KaizenIdea");

// Controller for creating a Kaizen idea
const {sendKaizenSubmissionEmail} = require("../services/emailService"); // Import email service
const createKaizenIdea = async (req, res) => {
    console.log("Received request body:", req.body);
    
    try {
        const {
            suggesterName,
            employeeCode,
            plantCode,
            email,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber,
            description,
            category,
            problemStatement,
            beforeKaizen,
            afterKaizen,
            benefits,
            implementationCost,
            benefitCostRatio,
            standardization,
            horizontalDeployment
        } = req.body;

        if (!suggesterName || !employeeCode || !category || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const newKaizen = new KaizenIdea({
            suggesterName,
            employeeCode,
            plantCode,
            email,
            implementerName,
            implementerCode,
            implementationDate,
            registrationNumber,
            description,
            category,
            problemStatement,
            beforeKaizen,
            afterKaizen,
            benefits,
            implementationCost,
            benefitCostRatio,
            standardization,
            horizontalDeployment,

            // ✅ Explicitly Set Defaults to Avoid Auto-Approval Issues
            isApproved: false,    
            status: "Pending",    
            currentStage: 0,      

            // ✅ Ensure Stages Start with "Pending" Status
            stages: [
                {
                    label: "Initial Review",
                    description: "Reviewed by the quality control team",
                    status: "pending", 
                    timestamp: null,  
                }
            ]
        });

        await newKaizen.save();

        // ✅ Send Email (after saving to DB)
        await sendKaizenSubmissionEmail(email, newKaizen);

        res.status(201).json({ success: true, message: "Kaizen idea created successfully.", kaizen: newKaizen });
    } catch (error) {
        console.error("Error creating Kaizen idea:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


// Controller to get all Kaizen ideas with filtering, sorting, and pagination
const getAllKaizenIdeas = async (req, res) => {
    try {
        const { status, category, sortBy, page = 1, limit = 10 } = req.query;

        // Filtering options
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        // Sorting & Pagination options
        const sortOption = sortBy ? { [sortBy]: 1 } : { createdAt: -1 }; // Default: Newest first
        const pageNumber = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        // Fetching filtered, sorted, paginated data with all required fields
        const ideas = await KaizenIdea.find(filter)
            .select(
                "suggesterName employeeCode plantCode implementerName implementerCode implementationDate date registrationNumber category otherCategory problemStatement description beforeKaizen afterKaizen benefits implementationCost benefitCostRatio standardization horizontalDeployment status createdAt"
            )
            .sort(sortOption)
            .skip((pageNumber - 1) * pageLimit) 
            .limit(pageLimit)
            .lean(); // Converts Mongoose docs to plain JavaScript objects

        // Ensuring missing fields return as `null` instead of being absent
        const formattedIdeas = ideas.map(idea => ({
            suggesterName: idea.suggesterName || null,
            employeeCode: idea.employeeCode || null,
            plantCode: idea.plantCode || null,
            implementerName: idea.implementerName || null,
            implementerCode: idea.implementerCode || null,
            implementationDate : idea.implementationDate || null,
            date: idea.date || null,
            registrationNumber: idea.registrationNumber || null,
            category: idea.category || null,
            otherCategory: idea.otherCategory || null,
            problemStatement: idea.problemStatement || null,
            description: idea.description || null,
            beforeKaizen: idea.beforeKaizen || null,
            afterKaizen: idea.afterKaizen || null,
            benefits: idea.benefits || null,
            implementationCost: idea.implementationCost || 0,
            benefitCostRatio: idea.benefitCostRatio || 0,
            standardization: idea.standardization || null,
            horizontalDeployment: idea.horizontalDeployment || null,
            status: idea.status || "Pending",
            createdAt: idea.createdAt || null,
            _id: idea._id,
        }));

        // Getting total count for pagination
        const totalIdeas = await KaizenIdea.countDocuments(filter);

        res.status(200).json({
            success: true,
            ideas: formattedIdeas,
            totalPages: Math.ceil(totalIdeas / pageLimit),
            currentPage: pageNumber,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


const getKaizenIdeaByRegistrationNumber = async (req, res) => {
    try {
        console.log("Received Query Params:", req.query); // Debugging

        const { registrationNumber } = req.query;

        if (!registrationNumber) {
            return res.status(400).json({ success: false, message: "Registration number is required" });
        }

        console.log("Searching for registration number:", registrationNumber); // Debugging

        const idea = await KaizenIdea.findOne({ registrationNumber: registrationNumber });

        if (!idea) {
            console.log("No Kaizen found for:", registrationNumber); // Debugging
            return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        }

        console.log("Kaizen Found:", idea); // Debugging
        res.status(200).json({ success: true, idea });
    } catch (error) {
        console.error("🔥 Server Error:", error.message);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};




// Controller to update a Kaizen idea
const updateKaizenIdea = async (req, res) => {
    try {
        const updatedIdea = await KaizenIdea.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        res.status(200).json({ success: true, message: "Kaizen idea updated successfully", updatedIdea });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Controller to delete a Kaizen idea
const deleteKaizenIdea = async (req, res) => {
    try {
        const deletedIdea = await KaizenIdea.findByIdAndDelete(req.params.id);
        if (!deletedIdea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        res.status(200).json({ success: true, message: "Kaizen idea deleted successfully" });
    } catch (error) {
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
