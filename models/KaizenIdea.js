const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// 🔹 Schema for individual approval stages
const StageSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ["completed", "active", "error", "pending"], required: true }
});

// 🔹 Schema for tracking approval history
const ApprovalHistorySchema = new mongoose.Schema({
  approverEmail: { type: String, required: true },
  decision: { type: String, enum: ["approved", "rejected"], required: true },
  stepId: { type: String, required: true },
  role: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  comments: { type: String, trim: true, default: "" }
});

// 🔹 Main Kaizen Idea Schema
const KaizenIdeaSchema = new mongoose.Schema(
  {
    // 🔹 Auto-generated Form ID (Unique, Immutable)
    formId: { 
      type: String, 
      default: uuidv4, 
      unique: true, 
      required: true, 
      immutable: true 
    },

    used: { type: Boolean, default: false }, // 🔥 Prevent form reuse
    expiresAt: { type: Date, index: { expires: '1d' } }, // Auto-delete after 24 hours if not used

    suggesterName: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    plantCode: { type: String, required: true, trim: true },
    implementerName: { type: String, trim: true, default: "" },
    implementerCode: { type: String, trim: true, default: "" },
    implementationDate: { type: Date, default: null },
    date: { type: Date, default: Date.now },

    // 🔹 Unique Kaizen Registration Number
    registrationNumber: { type: String, required: true, unique: true },
    

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
    currentApprovers: { type: [String], default: [] },
    workflowVersion: { type: Number, default: null },

    stages: { type: [StageSchema], default: [] },

    // 🔹 Approval History (For audit trail)
    approvalHistory: { type: [ApprovalHistorySchema], default: [] },

    // 🔹 More Meaningful Status Options
    status: {
      type: String,
      enum: ["Pending", "Pending Approval", "Approved", "Rejected"],
      default: "Pending",
    },
    
    // 🔹 Image Upload Fields
    beforeKaizenFiles: { type: [String], default: [] },
    afterKaizenFiles: { type: [String], default: [] },
  },
  { timestamps: true }
);


// Middleware: Set expiration time when form is created
KaizenIdeaSchema.pre("save", function (next) {
  if (!this.used && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
  }
  next();
});

module.exports = mongoose.model("KaizenIdea", KaizenIdeaSchema);