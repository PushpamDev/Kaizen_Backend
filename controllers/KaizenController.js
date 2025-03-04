const KaizenIdea = require("../models/KaizenIdea");

// Controller for creating a Kaizen idea
const createKaizenIdea = async (req, res) => {
    console.log("Received request body:", req.body);
    
    try {
        const {
            suggestorName,
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

        if (!suggestorName || !employeeCode || !category) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const newKaizen = new KaizenIdea({
            suggestorName,
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

// Controller to get all Kaizen ideas
const getAllKaizenIdeas = async (req, res) => {
    try {
        const ideas = await KaizenIdea.find();
        res.status(200).json({ success: true, ideas });
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
