const mongoose = require("mongoose");

const StageSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: null },  
  status: { type: String, enum: ["completed", "active", "error", "pending"], required: true }
});

const ApprovalHistorySchema = new mongoose.Schema({
  approverEmail: { type: String, required: true },
  decision: { type: String, enum: ["approved", "rejected"], required: true },
  timestamp: { type: Date, default: Date.now },
  comments: { type: String, trim: true, default: "" }
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

    // 🔹 Unique Kaizen Registration Number (Previously had default: "")
    registrationNumber: { type: String, required: true, unique: true, trim: true },

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

    // 🔹 Status & Workflow Tracking
    currentStage: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    currentApprover: { type: String, trim: true, default: "" }, // ✅ Track who is currently reviewing

    stages: {
      type: [StageSchema],
      default: [
        {
          label: "Initial Review",
          description: "Reviewed by the quality control team",
          status: "pending",
          timestamp: null,
        },
      ],
    },

    // 🔹 Approval History (For audit trail)
    approvalHistory: {
      type: [ApprovalHistorySchema],
      default: []
    },

    // 🔹 More Meaningful Status Options
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
