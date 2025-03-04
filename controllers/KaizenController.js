const KaizenIdea = require("../models/KaizenIdea");

// Controller for creating a Kaizen idea
const createKaizenIdea = async (req, res) => {
    console.log("Received request body:", req.body);
    
    try {
        const {
            suggesterName,
            employeeCode,
            implementerName,
            implementerCode,
            registrationNumber,
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

        if (!suggesterName || !employeeCode || !category) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const newKaizen = new KaizenIdea({
            suggesterName,
            employeeCode,
            implementerName,
            implementerCode,
            registrationNumber,
            category,
            problemStatement,
            beforeKaizen,
            afterKaizen,
            benefits,
            implementationCost,
            benefitCostRatio,
            standardization,
            horizontalDeployment,
        });

        await newKaizen.save();
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

        // Fetching filtered, sorted, paginated data
        const ideas = await KaizenIdea.find(filter)
            .select("suggesterName registrationNumber category createdAt problemStatement status")
            .sort(sortOption)
            .skip((pageNumber - 1) * pageLimit)
            .limit(pageLimit)
            .lean(); // Converts Mongoose docs to plain JavaScript objects

        // Ensure missing `suggesterName` fields return as `null` instead of being absent
        const formattedIdeas = ideas.map(idea => ({
            suggesterName: idea.suggesterName || null,
            registrationNumber: idea.registrationNumber || null,
            category: idea.category || null,
            createdAt: idea.createdAt,
            problemStatement: idea.problemStatement || null,
            status: idea.status || null,
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

// Controller to get a single Kaizen idea by ID
const getKaizenIdeaById = async (req, res) => {
    try {
        const idea = await KaizenIdea.findById(req.params.id);
        if (!idea) return res.status(404).json({ success: false, message: "Kaizen idea not found" });
        res.status(200).json({ success: true, idea });
    } catch (error) {
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
    getKaizenIdeaById,
    updateKaizenIdea,
    deleteKaizenIdea
};
