const ApprovalWorkflow = require("../models/ApprovalWorkflow");

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

// 📌 Get the workflow for a specific plant
const getApprovalWorkflow = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (!workflow) {
            return res.status(404).json({ success: false, message: "No workflow found for this plant." });
        }

        // Fetch plantName from the mapping
        const plantName = plantData[plantCode]?.frGroupName || "Unknown Plant";

        res.status(200).json({
            success: true,
            plantCode: workflow.plantCode,
            plantName,  // ✅ Now included in the response
            steps: workflow.steps,
            splitStep: workflow.splitStep,
            approvalHierarchy: workflow.approvalHierarchy
        });
    } catch (error) {
        console.error("❌ Error fetching workflow:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Set Workflow Structure (Admin Control) - Steps & Hierarchy
const setWorkflowStructure = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { steps, approvalHierarchy } = req.body;

        if (!steps || !Array.isArray(steps)) {
            return res.status(400).json({ success: false, message: "Invalid steps format" });
        }

        if (!approvalHierarchy || !Array.isArray(approvalHierarchy)) {
            return res.status(400).json({ success: false, message: "Invalid approval hierarchy format" });
        }

        let workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (!workflow) {
            workflow = new ApprovalWorkflow({ plantCode, steps, approvalHierarchy });
        } else {
            workflow.steps = steps;
            workflow.approvalHierarchy = approvalHierarchy;
        }

        await workflow.save();

        res.status(200).json({ success: true, message: "Workflow structure updated successfully", workflow });
    } catch (error) {
        console.error("❌ Error updating workflow structure:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Add a Step
const addStep = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { index, title, description } = req.body;

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        const newStep = {
            id: workflow.steps.length + 1,
            title: title || `Step ${workflow.steps.length + 1}`,
            description: description || "New step added",
            isApproved: false,
            isRejected: false,
            editing: false
        };

        workflow.steps.splice(index, 0, newStep);
        await workflow.save();

        res.status(201).json({ success: true, message: "Step added successfully", steps: workflow.steps });
    } catch (error) {
        console.error("❌ Error adding step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Add a Split Step (Approval/Rejection Decision)
const addSplitStep = async (req, res) => {
    try {
        const { plantCode } = req.params;

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        // Check if a split step already exists
        if (workflow.splitStep.exists) {
            return res.status(400).json({ success: false, message: "A split step already exists for this workflow." });
        }

        workflow.splitStep = {
            exists: true,
            approvalPath: [],
            rejectionPath: []
        };

        await workflow.save();

        res.status(201).json({ success: true, message: "Split step added successfully", workflow });
    } catch (error) {
        console.error("❌ Error adding split step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Add a Sub-Path Step (Approval Hierarchy)
const addSubPathStep = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { type, title, description } = req.body;

        console.log("🔹 Incoming Request for Sub-Path Step:");
        console.log("Plant Code:", plantCode);
        console.log("Type:", type);
        console.log("Title:", title);
        console.log("Description:", description);

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            console.log("❌ Workflow not found for plantCode:", plantCode);
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        if (!workflow.splitStep || !workflow.splitStep.exists) {
            console.log("❌ Split step not found in workflow:", workflow);
            return res.status(400).json({ success: false, message: "Split step not found. Add a split step first." });
        }

        console.log("✅ Found Workflow & Split Step. Adding Sub-Path Step...");

        const newSubStep = {
            id: (workflow.splitStep.approvalPath.length + workflow.splitStep.rejectionPath.length) + 1,
            title: title || "Approval Step",
            description: description || "Sub-path approval step",
            isApproved: false,
            isRejected: false
        };

        if (type === "approval") {
            console.log("📌 Adding to Approval Path");
            workflow.splitStep.approvalPath.push(newSubStep);
        } else if (type === "rejection") {
            console.log("📌 Adding to Rejection Path");
            workflow.splitStep.rejectionPath.push(newSubStep);
        } else {
            console.log("❌ Invalid type provided:", type);
            return res.status(400).json({ success: false, message: "Invalid type. Use 'approval' or 'rejection'." });
        }

        await workflow.save();
        console.log("✅ Sub-Path Step Added Successfully!");

        res.status(201).json({ success: true, message: "Sub-path step added successfully", splitStep: workflow.splitStep });
    } catch (error) {
        console.error("❌ Error adding sub-path step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


// 📌 Edit a Step
const editStep = async (req, res) => {
    try {
        const { plantCode, id } = req.params;
        const { field, value } = req.body;

        const workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        const step = workflow.steps.find(step => step.id == id);
        if (!step) {
            return res.status(404).json({ success: false, message: "Step not found" });
        }

        step[field] = value;
        await workflow.save();

        res.status(200).json({ success: true, message: "Step updated successfully", steps: workflow.steps });
    } catch (error) {
        console.error("❌ Error editing step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Delete a Step
const deleteStep = async (req, res) => {
    try {
        const { plantCode, id } = req.params;

        const workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            return res.status(404).json({ success: false, message: "Workflow not found" });
        }

        workflow.steps = workflow.steps.filter(step => step.id != id);
        await workflow.save();

        res.status(200).json({ success: true, message: "Step deleted successfully", steps: workflow.steps });
    } catch (error) {
        console.error("❌ Error deleting step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    getApprovalWorkflow,
    setWorkflowStructure,
    addStep,
    addSplitStep,  // ✅ New function added
    addSubPathStep, // ✅ New function added
    editStep,
    deleteStep
};
