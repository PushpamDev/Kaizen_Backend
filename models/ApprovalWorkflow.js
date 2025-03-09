const mongoose = require("mongoose");

const approvalWorkflowSchema = new mongoose.Schema(
  {
    plantCode: {
      type: String,
      required: true,
      index: true,
    },
    steps: [
      {
        stepId: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        role: {
          type: String, // Removed enum to allow dynamic roles
          required: true,
        },
        approverEmail: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        decisionDate: {
          type: Date,
        },
        isSplitStep: {
          type: Boolean,
          default: false,
        },
        decisionPoint: {
          type: String, // Example: "costThreshold" or "requiresCFO"
          default: null,
        },
        conditions: {
          type: Object, // Example: { "costThreshold": 1000 }
          default: {},
        },
        subPaths: [
          {
            condition: String, // Condition that triggers this subpath
            approverEmail: String,
            role: String,
            order: Number,
          },
        ],
      },
    ],
    version: {
      type: Number,
      default: 1,
    },
    history: [
      {
        version: Number,
        changes: String, // Summary of changes
        updatedBy: String, // Email of admin who made the change
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// 📌 Auto-increment version & keep history up to 5 versions
approvalWorkflowSchema.pre("save", function (next) {
  if (this.history.length >= 5) {
    this.history.shift();
  }
  this.version += 1;
  next();
});

module.exports = mongoose.model("ApprovalWorkflow", approvalWorkflowSchema);
