const mongoose = require("mongoose");

// 🔹 Schema for individual approval stages
const StageSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }, // ✅ Defaults to Date.now for accurate timestamps
  status: { type: String, enum: ["completed", "active", "error", "pending"], required: true }
});

// 🔹 Schema for tracking approval history
const ApprovalHistorySchema = new mongoose.Schema({
  approverEmail: { type: String, required: true },
  decision: { type: String, enum: ["approved", "rejected"], required: true },
  stepId: { type: String, required: true }, // ✅ Track which step was approved
  role: { type: String, required: true }, // ✅ Store the approver's role
  timestamp: { type: Date, default: Date.now },
  comments: { type: String, trim: true, default: "" } // ✅ Trimmed comments to remove extra spaces
});

// 🔹 Main Kaizen Idea Schema
const KaizenIdeaSchema = new mongoose.Schema(
  {
    suggesterName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    plantCode: { type: String, required: true, trim: true },
    implementerName: { type: String, trim: true, default: "" },
    implementerCode: { type: String, trim: true, default: "" },
    implementationDate: { type: Date, default: null }, // ✅ Ensured date format is correct
    date: { type: Date, default: Date.now },

    // 🔹 Unique Kaizen Registration Number
    registrationNumber: { type: String, required: true, unique: true, trim: true },

    category: { type: String, required: true, trim: true },
    otherCategory: { type: String, trim: true, default: "" },
    problemStatement: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    beforeKaizen: { type: String, trim: true, default: "" },
    afterKaizen: { type: String, trim: true, default: "" },
    tangibleBenefits: { type: String, trim: true, default: "" },
    intangibleBenefits: { type: String, trim: true, default: "" },
    implementationCost: { type: Number, min: 0, default: 0 },
    benefitCostRatio: { type: Number, min: 0, default: 0 },
    standardization: { type: String, trim: true, default: "" },
    horizontalDeployment: { type: String, trim: true, default: "" },

    // 🔹 Status & Workflow Tracking
    currentStage: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    currentApprovers: { type: [String], default: [] }, // ✅ Supports multiple approvers
    workflowVersion: { type: Number, default: null }, // ✅ Tracks workflow version for approvals

    stages: {
      type: [StageSchema],
      default: [],
    },

    // 🔹 Approval History (For audit trail)
    approvalHistory: {
      type: [ApprovalHistorySchema],
      default: []
    },

    // 🔹 More Meaningful Status Options
    status: {
      type: String,
      enum: ["Pending", "Pending Approval", "Approved", "Rejected"], // ✅ Now supports "Pending Approval"
      default: "Pending",
    },
    
    // 🔹 Image Upload Fields
    beforeKaizenFiles: { type: [String], default: [] }, // Store image path or URL
    afterKaizenFiles: { type: [String], default: [] }, // Store image path or URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);
