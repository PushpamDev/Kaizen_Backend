const mongoose = require("mongoose");

const KaizenIdeaSchema = new mongoose.Schema(
    {
      suggesterName: { type: String, required: true },
      registrationNumber: { type: String, required: true, unique: true },
      categories: { type: [String], required: true },
      problemStatement: { type: String, required: true },
      solutionDescription: { type: String, required: true },
      financialBenefits: {
        estimatedSavings: { type: Number, required: true, default: 0 },
        actualSavings: { type: Number, required: true, default: 0 }
      },
      operationalBenefits: {
        efficiencyIncrease: { type: Number, required: true, default: 0 },
        defectReduction: { type: Number, required: true, default: 0 },
        leadTimeReduction: { type: Number, required: true, default: 0 }
      },
      status: { type: String, default: "Pending" }
    },
    { timestamps: true }
  );
  

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
