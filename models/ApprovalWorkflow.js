const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema({
    id: Number,
    title: String,
    description: String,
    isApproved: Boolean,
    isRejected: Boolean,
    editing: Boolean,
    approverRole: String, 
    nextSteps: [{ type: Number }], 
    subSteps: [{ 
        id: Number,
        title: String,
        isApproved: Boolean,
        approverRole: String, 
        nextSteps: [{ type: Number }]
    }]
});

// Predefined plant data
const plantData = {
    "1022": { frGroupName: "J-2 GGM" },
    "2014": { frGroupName: "N-5 GGM" },
    "1051": { frGroupName: "J-5 GGM" },
    "1031": { frGroupName: "J-3 MSR" },
    "2011": { frGroupName: "N-1 GGM" },
    "1513": { frGroupName: "JBMA FBD" },
    "2511": { frGroupName: "JBMI" },
    "8021": { frGroupName: "NMPL NGH-1" },
    "2111": { frGroupName: "N-11 BLR" },
    "2211": { frGroupName: "NMPL HUB" },
    "2201": { frGroupName: "NMPL HSR" },
    "2221": { frGroupName: "NMPL PNG" },
    "2191": { frGroupName: "NMPL CHK" },
    "1571": { frGroupName: "JBMA IND-1" },
    "2041": { frGroupName: "N-8 HDW" },
    "1561": { frGroupName: "JBMA SND TML" },
    "2081": { frGroupName: "N-10 PNG" },
    "1681": { frGroupName: "JBMA CHK" },
    "1551": { frGroupName: "JBMA NSK" },
    "7011": { frGroupName: "NIPL" },
    "2161": { frGroupName: "NMPL GGM" },
    "2132": { frGroupName: "N-14 VTP" },
    "2181": { frGroupName: "NMPL Waluj" },
    "1712": { frGroupName: "JBMA ORG-SSC" },
    "9211": { frGroupName: "ThirdEye AI" },
    "1054": { frGroupName: "NMPL SSC CHK" }
};

const approvalWorkflowSchema = new mongoose.Schema({
    plantCode: { type: String, required: true, unique: true },
    plantName: { type: String, default: "" },  // Automatically populate
    steps: [stepSchema],
    splitStep: {
        exists: { type: Boolean, default: false },
        approvalPath: [{ 
            id: Number,
            title: String,
            description: String,
            isApproved: Boolean,
            isRejected: Boolean
        }],
        rejectionPath: [{ 
            id: Number,
            title: String,
            description: String,
            isApproved: Boolean,
            isRejected: Boolean
        }]
    },
    approvalHierarchy: [
        {
            role: String, 
            order: Number 
        }
    ]
});

// Middleware to auto-populate plantName before saving
approvalWorkflowSchema.pre("save", function (next) {
    this.plantName = plantData[this.plantCode]?.frGroupName || "Unknown Plant";
    next();
});

module.exports = mongoose.model("ApprovalWorkflow", approvalWorkflowSchema);
