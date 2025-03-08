const ApprovalWorkflow = require("../models/ApprovalWorkflow");

const defaultWorkflow = (plantCode) => ({
    plantCode,
    steps: [
        {
            id: 1,
            title: "Step 1: Initial Review",
            description: "Review the submitted Kaizen idea.",
            isApproved: false,
            isRejected: false,
            editing: false,
            approverRole: "Supervisor",
            nextSteps: [2],
            subSteps: []
        },
        {
            id: 2,
            title: "Step 2: Manager Approval",
            description: "Manager reviews and approves the idea.",
            isApproved: false,
            isRejected: false,
            editing: false,
            approverRole: "Manager",
            nextSteps: [3],
            subSteps: []
        },
        {
            id: 3,
            title: "Step 3: Final Approval",
            description: "Final approval from the Plant Head.",
            isApproved: false,
            isRejected: false,
            editing: false,
            approverRole: "Plant Head",
            nextSteps: [],
            subSteps: []
        }
    ],
    splitStep: {
        exists: true,
        approvalPath: [],
        rejectionPath: []
    },
    approvalHierarchy: [
        { role: "Supervisor", order: 1 },
        { role: "Manager", order: 2 },
        { role: "Plant Head", order: 3 }
    ],
    revisionHistory: []
});

// 📌 Get Workflow for a Specific Plant
const getApprovalWorkflow = async (req, res) => {
    try {
        const { plantCode } = req.params;
        let workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (!workflow) {
            return res.status(200).json({
                success: true,
                message: "No custom workflow found, returning default.",
                workflow: defaultWorkflow(plantCode),
            });
        }

        res.status(200).json({ success: true, workflow });
    } catch (error) {
        console.error("❌ Error fetching workflow:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Set Workflow Structure (Stores Last 5 Versions)
const setWorkflowStructure = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { steps, approvalHierarchy } = req.body;

        if (!Array.isArray(steps) || !Array.isArray(approvalHierarchy)) {
            return res.status(400).json({ success: false, message: "Invalid format for steps or hierarchy" });
        }

        let workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (!workflow) {
            workflow = new ApprovalWorkflow({ ...defaultWorkflow(plantCode), steps, approvalHierarchy });
        } else {
            if (workflow.revisionHistory.length >= 5) workflow.revisionHistory.shift();
            workflow.revisionHistory.push({ steps: workflow.steps, approvalHierarchy: workflow.approvalHierarchy });

            workflow.steps = steps;
            workflow.approvalHierarchy = approvalHierarchy;
        }

        await workflow.save();
        res.status(200).json({ success: true, message: "Workflow updated", workflow });
    } catch (error) {
        console.error("❌ Error updating workflow:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const sendEmail = require("../services/emailService");
const notifyFirstApprover = async (plantCode, ideaDetails) => {
    try {
        const workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow || workflow.steps.length === 0) return;

        const firstApproverRole = workflow.steps[0].approverRole;
        const firstApprover = await getUserByRoleAndPlant(firstApproverRole, plantCode); // Implement this function

        if (!firstApprover || !firstApprover.email) return;

        const subject = "New Kaizen Idea Submission - Approval Required";
        const text = `Dear ${firstApprover.name},\n\nA new Kaizen idea has been submitted for approval.\n\nIdea Title: ${ideaDetails.title}\nSubmitted By: ${ideaDetails.submitterName}\n\nPlease review and take action.\n\nThank you.`;
        const html = `<p>Dear ${firstApprover.name},</p>
                      <p>A new Kaizen idea has been submitted for approval.</p>
                      <p><strong>Idea Title:</strong> ${ideaDetails.title}</p>
                      <p><strong>Submitted By:</strong> ${ideaDetails.submitterName}</p>
                      <p>Please review and take action.</p>
                      <p>Thank you.</p>`;

        await sendEmail(firstApprover.email, subject, text, html);
    } catch (error) {
        console.error("❌ Error notifying first approver:", error);
    }
};

// 📌 Add a Step
const addStep = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { index, title, description } = req.body;

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found" });

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

        res.status(201).json({ success: true, message: "Step added", steps: workflow.steps });
    } catch (error) {
        console.error("❌ Error adding step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Add a Split Step
const addSplitStep = async (req, res) => {
    try {
        const { plantCode } = req.params;

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found" });

        if (workflow.splitStep.exists) {
            return res.status(400).json({ success: false, message: "Split step already exists" });
        }

        workflow.splitStep = { exists: true, approvalPath: [], rejectionPath: [] };
        await workflow.save();

        res.status(201).json({ success: true, message: "Split step added", workflow });
    } catch (error) {
        console.error("❌ Error adding split step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 Add a Sub-Path Step (Approval/Rejection)
const addSubPathStep = async (req, res) => {
    try {
        const { plantCode } = req.params;
        const { type, title, description } = req.body;

        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found" });

        if (!workflow.splitStep.exists) {
            return res.status(400).json({ success: false, message: "Add a split step first" });
        }

        const newSubStep = {
            id: (workflow.splitStep.approvalPath.length + workflow.splitStep.rejectionPath.length) + 1,
            title: title || "Approval Step",
            description: description || "Sub-path approval step",
            isApproved: false,
            isRejected: false
        };

        if (type === "approval") {
            workflow.splitStep.approvalPath.push(newSubStep);
        } else if (type === "rejection") {
            workflow.splitStep.rejectionPath.push(newSubStep);
        } else {
            return res.status(400).json({ success: false, message: "Invalid type. Use 'approval' or 'rejection'." });
        }

        await workflow.save();
        res.status(201).json({ success: true, message: "Sub-path step added", splitStep: workflow.splitStep });
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
        if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found" });

        const step = workflow.steps.find(step => step.id == id);
        if (!step) return res.status(404).json({ success: false, message: "Step not found" });

        step[field] = value;
        await workflow.save();

        res.status(200).json({ success: true, message: "Step updated", steps: workflow.steps });
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
        if (!workflow) return res.status(404).json({ success: false, message: "Workflow not found" });

        workflow.steps = workflow.steps.filter(step => step.id != id);
        await workflow.save();

        res.status(200).json({ success: true, message: "Step deleted", steps: workflow.steps });
    } catch (error) {
        console.error("❌ Error deleting step:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


module.exports = { getApprovalWorkflow, setWorkflowStructure, addStep, addSplitStep, addSubPathStep, editStep, deleteStep , notifyFirstApprover};
