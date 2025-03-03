const KaizenIdea = require("../models/KaizenIdea");
const { uploadKaizenFiles } = require("../middleware/uploadMiddleware");  // Import the middleware

// Compress image function
const compressImage = async (fileBuffer) => {
    const sharp = require("sharp");
    const compressedBuffer = await sharp(fileBuffer)
        .resize(800)  // Resize the image to 800px wide
        .toFormat("jpeg", { quality: 70 })  // Compress the image to JPEG with 70% quality
        .toBuffer();
    return compressedBuffer;
};

// Controller for creating Kaizen idea
const createKaizenIdea = async (req, res) => {
  console.log("✅ Received Body:", req.body);
console.log("✅ Received Files:", req.files);


  try {
    const { suggesterName, registrationNumber, categories, problemStatement, solutionDescription, financialBenefits = {}, operationalBenefits = {} } = req.body;

    if (!suggesterName || !registrationNumber || !problemStatement || !solutionDescription) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    let beforeKaizenFiles = [], afterKaizenFiles = [];
    let beforeKaizenDocs = [], afterKaizenDocs = [];

    // Handle file processing if files are uploaded
    if (req.files["beforeKaizenFiles"]) {
      beforeKaizenFiles = await Promise.all(
        req.files["beforeKaizenFiles"].map(async (file) => {
          const compressedFile = await compressImage(file.buffer);  // Compress image if it's an image file
          return compressedFile;
        })
      );
    }

    if (req.files["afterKaizenFiles"]) {
      afterKaizenFiles = await Promise.all(
        req.files["afterKaizenFiles"].map(async (file) => {
          const compressedFile = await compressImage(file.buffer);
          return compressedFile;
        })
      );
    }

    if (req.files["beforeKaizenDocs"]) {
      beforeKaizenDocs = req.files["beforeKaizenDocs"].map(file => file.buffer);  // Just store the file buffer for documents
    }

    if (req.files["afterKaizenDocs"]) {
      afterKaizenDocs = req.files["afterKaizenDocs"].map(file => file.buffer);  // Just store the file buffer for documents
    }

    const newIdea = new KaizenIdea({
      suggesterName,
      registrationNumber,
      categories,
      problemStatement,
      solutionDescription,
      financialBenefits,
      operationalBenefits,
      beforeKaizenFiles,
      afterKaizenFiles,
      beforeKaizenDocs,
      afterKaizenDocs
    });

    await newIdea.save();

    res.status(201).json({ success: true, message: "Kaizen idea created successfully", kaizen: newIdea });
  } catch (error) {
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
    deleteKaizenIdea,
    uploadKaizenFiles  // No need for multer logic here
};
