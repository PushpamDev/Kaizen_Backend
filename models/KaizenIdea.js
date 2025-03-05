const mongoose = require("mongoose");

const StageSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, required: true },
  status: { type: String, enum: ["completed", "active", "error", "pending"], required: true }
});

const KaizenIdeaSchema = new mongoose.Schema(
  {
    suggesterName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    plantCode: { type: String, required: true, trim: true },
    implementerName: { type: String, trim: true, default: "" }, // ✅ Made optional
    implementerCode: { type: String, trim: true, default: "" }, // ✅ Made optional
    implementationDate: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now },
    registrationNumber: { type: String, unique: true, trim: true, default: "" }, // ✅ Made optional
    category: { type: String, required: true, trim: true },
    otherCategory: { type: String, trim: true, default: "" },
    problemStatement: { type: String, trim: true, default: "" }, // ✅ Made optional
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
      enum: ["Pending", "Completed", "Inprogress"],
      default: "Pending",
    },

        // 🔹 New fields for Status Bar
    currentStage: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    stages: [
      {
        label: String,
        description: String,
        timestamp: String,
        status: { type: String, enum: ["completed", "active", "pending", "error"] },
      },
    ],

    status: {
      type: String,
      enum: ["Pending", "Completed", "Inprogress"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);