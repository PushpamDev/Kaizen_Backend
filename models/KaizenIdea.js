const mongoose = require("mongoose");

const KaizenIdeaSchema = new mongoose.Schema(
  {
    suggestorName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    implementerName: { type: String, required: true, trim: true },
    implementerCode: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    otherCategory: { type: String, trim: true, default: "" },
    problemStatement: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    beforeKaizen: { type: String, trim: true, default: "" },
    afterKaizen: { type: String, trim: true, default: "" },
    benefits: { type: String, trim: true, default: "" },
    implementationCost: { type: Number, min: 0, default: 0 },
    benefitCostRatio: { type: Number, min: 0, default: 0 },
    standardization: { type: String, trim: true, default: "" },
    horizontalDeployment: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
