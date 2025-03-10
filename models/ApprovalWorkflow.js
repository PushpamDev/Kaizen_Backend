const mongoose = require("mongoose");

const ApprovalStepSchema = new mongoose.Schema({
    stepId: { type: String, required: true }, // Unique identifier for step (String)
    role: { type: String, required: true },
    approverEmail: { type: String, required: true },
    parentStepId: { type: String, default: null }, // Parent step as String
    children: [{ type: String }], // Array of child step IDs as Strings
    decisionPoint: { type: String, enum: ["approve", "reject", null], default: null } // Decision criteria
});

const ApprovalWorkflowSchema = new mongoose.Schema({
    plantCode: { type: String, required: true, unique: true },
    steps: [ApprovalStepSchema], // Stores all steps in an array
    version: { type: Number, default: 1 },
    history: [
        {
            version: Number,
            changes: String,
            updatedAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("ApprovalWorkflow", ApprovalWorkflowSchema);
