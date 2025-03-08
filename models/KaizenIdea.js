const mongoose = require("mongoose");

const StageSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: null },  // ✅ Timestamp is now optional
  status: { type: String, enum: ["completed", "active", "error", "pending"], required: true }
});

const KaizenIdeaSchema = new mongoose.Schema(
  {
    suggesterName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    plantCode: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    implementerName: { type: String, trim: true, default: "" },
    implementerCode: { type: String, trim: true, default: "" },
    implementationDate: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
    registrationNumber: { type: String, unique: true, trim: true, default: "" },
    category: { type: String, required: true, trim: true },
    otherCategory: { type: String, trim: true, default: "" },
    problemStatement: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    beforeKaizen: { type: String, trim: true, default: "" },
    afterKaizen: { type: String, trim: true, default: "" },
    benefits: { type: String, trim: true, default: "" },
    implementationCost: { type: Number, min: 0, default: 0 },
    benefitCostRatio: { type: Number, min: 0, default: 0 },
    standardization: { type: String, trim: true, default: "" },
    horizontalDeployment: { type: String, trim: true, default: "" },

    // 🔹 Status & Workflow Fields
    currentStage: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    stages: {
      type: [StageSchema], // ✅ Reference `StageSchema`
      default: [
        {
          label: "Initial Review",
          description: "Reviewed by the quality control team",
          status: "pending",  // ✅ Ensure first stage is always "pending"
          timestamp: null,     // ✅ No timestamp initially
        },
      ],
    },

    status: {
      type: String,
      enum: ["Pending", "Completed", "Inprogress"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
