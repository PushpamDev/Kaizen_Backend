const mongoose = require("mongoose");

const ApprovalStepSchema = new mongoose.Schema({
    role: { type: String, required: true },
    approverEmail: { type: String, required: true },
    parentStepId: { type: mongoose.Schema.Types.ObjectId, ref: "ApprovalStep", default: null }, // Parent step
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "ApprovalStep" }], // Child steps
    decisionPoint: { type: String, enum: ["approve", "reject", null], default: null } // Decision criteria
});

const ApprovalWorkflowSchema = new mongoose.Schema({
    plantCode: { type: String, required: true, unique: true },
    steps: [ApprovalStepSchema], // Parent-child structure
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
