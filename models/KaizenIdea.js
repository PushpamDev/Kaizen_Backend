const mongoose = require("mongoose");

const KaizenIdeaSchema = new mongoose.Schema(
  {
    suggestorName: { type: String, required: true },
    employeeCode: { type: String, required: true },
    implementerName: { type: String, required: true },
    implementerCode: { type: String, required: true },
    date: { type: Date, default: Date.now },
    registrationNumber: { type: Number, required: true, unique: true },
    category: { type: String, required: true },
    otherCategory: { type: String, default: "" },  // Optional
    problemStatement: { type: String, required: true },
    description: { type: String, default: "" },  // Optional
    beforeKaizen: { type: String, default: "" },  // Optional
    afterKaizen: { type: String, default: "" },  // Optional
    beforeKaizenFiles: [
      {
        data: Buffer,  // Store image as binary data
        contentType: String,  // MIME type (e.g., "image/png", "image/jpeg")
      }
    ],
    afterKaizenFiles: [
      {
        data: Buffer,
        contentType: String,
      }
    ],
    benefits: { type: String, default: "" },  // Optional
    implementationCost: { type: Number, default: 0 },  // Optional
    benefitCostRatio: { type: Number, default: 0 },  // Optional
    standardization: { type: String, default: "" },  // Optional
    horizontalDeployment: { type: String, default: "" },  // Optional
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
