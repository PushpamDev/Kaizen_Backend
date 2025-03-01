const KaizenIdea = require("../models/KaizenIdea"); // Ensure this file exists

console.log("KaizenIdea Model:", KaizenIdea);
console.log("KaizenIdea.findOne Type:", typeof KaizenIdea.findOne);

const createKaizenIdea = async (req, res) => {
    try {
      const {
        suggesterName,
        registrationNumber,
        categories,
        problemStatement,
        solutionDescription,
        financialBenefits = {},
        operationalBenefits = {}
      } = req.body;
  
      if (!suggesterName || !registrationNumber || !problemStatement || !solutionDescription) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
      }
  
      // Ensure nested objects have all required fields
      const validatedFinancialBenefits = {
        estimatedSavings: financialBenefits.estimatedSavings || 0,
        actualSavings: financialBenefits.actualSavings || 0
      };
  
      const validatedOperationalBenefits = {
        efficiencyIncrease: operationalBenefits.efficiencyIncrease || 0,
        defectReduction: operationalBenefits.defectReduction || 0,
        leadTimeReduction: operationalBenefits.leadTimeReduction || 0
      };
  
      console.log("✅ Validated Financial Benefits:", validatedFinancialBenefits);
      console.log("✅ Validated Operational Benefits:", validatedOperationalBenefits);
  
      const newIdea = new KaizenIdea({
        suggesterName,
        registrationNumber,
        categories,
        problemStatement,
        solutionDescription,
        financialBenefits: validatedFinancialBenefits,
        operationalBenefits: validatedOperationalBenefits
      });
  
      console.log("📝 Saving new Kaizen idea:", newIdea);
  
      await newIdea.save();
  
      res.status(201).json({
        success: true,
        message: "Kaizen idea created successfully",
        kaizen: newIdea
      });
    } catch (error) {
      console.error("🚨 Server Error:", error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  };
  

  // Get a Kaizen idea by ID
const getKaizenById = async (req, res) => {
    try {
      const { id } = req.params;
      const kaizenIdea = await KaizenIdea.findById(id);
  
      if (!kaizenIdea) {
        return res.status(404).json({ success: false, message: "Kaizen idea not found" });
      }
  
      res.status(200).json({ success: true, kaizen: kaizenIdea });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  };
  
  // ✅ Update Kaizen by ID
const updateKaizen = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedKaizen = await KaizenIdea.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedKaizen) {
            return res.status(404).json({ message: "Kaizen not found" });
        }

        res.json({
            message: "Kaizen updated successfully",
            kaizen: updatedKaizen
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ DELETE Kaizen by ID
const deleteKaizen = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedKaizen = await KaizenIdea.findByIdAndDelete(id);

        if (!deletedKaizen) {
            return res.status(404).json({ message: "Kaizen not found" });
        }

        res.json({ message: "Kaizen deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// 📜 List Kaizens with Pagination & Filters
const listKaizens = async (req, res) => {
    try {
        let { page = 1, limit = 10, category, status } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {};
        if (category) filter.categories = category; // Filter by category
        if (status) filter.status = status; // Filter by status

        const total = await KaizenIdea.countDocuments(filter);
        const kaizens = await KaizenIdea.find(filter)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            items: kaizens,
            total,
            page,
            limit,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
  module.exports = { createKaizenIdea, getKaizenById, updateKaizen , deleteKaizen, listKaizens };

