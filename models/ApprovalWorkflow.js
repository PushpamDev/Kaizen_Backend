const mongoose = require("mongoose");

const ApprovalStepSchema = new mongoose.Schema({
    stepId: { type: String, required: true }, // Unique identifier for step
    role: { type: String, required: true },
    approverEmail: { type: String, required: true },
    decisionPoint: { type: String, enum: ["approve", "reject", null], default: null },
    children: [{ type: mongoose.Schema.Types.Mixed, default: [] }]

});

const ApprovalWorkflowSchema = new mongoose.Schema({
    plantCode: { type: String, required: true, unique: true },
    steps: [ApprovalStepSchema], // **Stores steps as nested subdocuments**
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