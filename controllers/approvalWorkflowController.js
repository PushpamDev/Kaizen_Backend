const ApprovalWorkflow = require("../models/ApprovalWorkflow"); // ✅ Standardized
const KaizenIdea = require("../models/KaizenIdea"); // ✅ Singular
const { sendApprovalEmail } = require("../services/emailService");



const defaultWorkflow = (plantCode) => ({
    plantCode,
    steps: [
        { id: 1, title: "Initial Review", description: "Reviewed by the quality control team", isApproved: false, isRejected: false, approverRole: "Supervisor", nextSteps: [2], order: 1 },
        { id: 2, title: "Manager Approval", description: "Manager reviews and approves", isApproved: false, isRejected: false, approverRole: "Manager", nextSteps: [3], order: 2 },
        { id: 3, title: "Senior Manager Approval", description: "Sr. Manager final review", isApproved: false, isRejected: false, approverRole: "Sr Manager", nextSteps: [4], order: 3 },
        { id: 4, title: "Plant Head Approval", description: "Final approval by Plant Head", isApproved: false, isRejected: false, approverRole: "Plant Head", nextSteps: [], order: 4 }
    ],
    approvalHierarchy: [
        { role: "Supervisor", order: 1 },
        { role: "Manager", order: 2 },
        { role: "Sr Manager", order: 3 },
        { role: "Plant Head", order: 4 }
    ],
    revisionHistory: []
});


const getApprovalWorkflow = async (req, res) => {
    try {
        console.log("Fetching workflow for plant:", req.params.plantCode);
        const { plantCode } = req.params;
        let workflow = await ApprovalWorkflow.findOne({ plantCode });
        if (!workflow) {
            console.log("No workflow found, returning default.");
            return res.status(200).json({ success: true, message: "Returning default workflow.", workflow: defaultWorkflow(plantCode) });
        }
        console.log("Workflow found:", workflow);
        res.status(200).json({ success: true, workflow });
    } catch (error) {
        console.error("Error fetching workflow:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

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
        console.error("Error updating workflow:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const approveKaizenIdea = async (req, res) => {
    try {
        const { registrationNumber } = req.body;
        console.log(`Approving Kaizen Idea for registration number: ${registrationNumber}`);

        const kaizenIdea = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizenIdea) {
            console.log("❌ Kaizen idea not found");
            return res.status(404).json({ message: "Kaizen idea not found" });
        }

        console.log("Kaizen Idea found:", kaizenIdea);

        // Check if already fully approved
        if (kaizenIdea.isApproved) {
            console.log("❌ This Kaizen is already fully approved.");
            return res.status(400).json({ message: "This Kaizen has already been fully approved or rejected" });
        }

        const workflow = await ApprovalWorkflow.findOne({ plantCode: kaizenIdea.plantCode });
        if (!workflow) {
            console.log("❌ Approval workflow not found for plant:", kaizenIdea.plantCode);
            return res.status(404).json({ message: "Approval workflow not found for this plant" });
        }

        console.log("Approval Workflow found:", workflow);
        console.log("Approval Workflow Steps:", workflow.steps);  // 🔴 LOG STEPS

        if (!workflow.steps || workflow.steps.length === 0) {
            console.log("❌ No approval steps found in workflow.");
            return res.status(400).json({ message: "No approval steps found for this workflow" });
        }

        const currentStageIndex = kaizenIdea.currentStage;
        const currentStage = kaizenIdea.stages[currentStageIndex];

        console.log(`Current approval stage index: ${currentStageIndex}`);
        console.log(`Current stage status: ${currentStage?.status}`);

        if (!currentStage || (currentStage.status === "completed" && kaizenIdea.currentStage >= kaizenIdea.stages.length)) {
            console.log("❌ This Kaizen has already been fully approved or rejected.");
            return res.status(400).json({ message: "This Kaizen has already been fully approved or rejected" });
        }

        const approverRole = workflow.steps.find(step => step.order === currentStageIndex + 1)?.approverRole;
        if (!approverRole) {
            console.log("❌ Approver role not found at stage index:", currentStageIndex);
            return res.status(400).json({ message: "Approver role not found" });
        }

        console.log(`Approving at role: ${approverRole}`);

        const approverEmails = {
            "Supervisor": "davidpushpam30@gmail.com",
            "Manager": "koyim61156@payposs.com",
            "Sr Manager": "olxhep@gmail.com",
            "Plant Head": "210305124120@paruluniversity.ac.in"
        };

        const approverEmail = approverEmails[approverRole];
        if (!approverEmail) {
            console.log("❌ Invalid approver role:", approverRole);
            return res.status(400).json({ message: "Invalid approver role" });
        }

        console.log(`✅ Sending approval email to: ${approverEmail}`);

        // Mark current stage as completed
        kaizenIdea.stages[currentStageIndex].status = "completed";

        // Move to the next stage
        kaizenIdea.currentStage++;

        // If all stages are completed, mark as approved
        if (kaizenIdea.currentStage >= kaizenIdea.stages.length) {
            kaizenIdea.isApproved = true;
            kaizenIdea.status = "Completed";
            console.log("✅ All approval stages completed. Kaizen is fully approved.");
        }

        await kaizenIdea.save();
        await sendApprovalEmail(approverEmail, { registrationNumber, suggesterName: kaizenIdea.suggesterName, description: kaizenIdea.description });

        res.status(200).json({ message: `Kaizen approved at ${approverRole} and email sent to ${approverRole}` });
    } catch (error) {
        console.error("❌ Error approving Kaizen:", error);
        res.status(500).json({ message: "Internal server error" });
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
            if (!workflow) {
                return res.status(404).json({ success: false, message: "Workflow not found" });
            }
    
            if (!workflow.splitStep.exists) {
                return res.status(400).json({ success: false, message: "Add a split step first" });
            }
    
            // Ensure a unique ID is assigned
            const existingIds = [
                ...workflow.splitStep.approvalPath.map(step => step.id || 0),
                ...workflow.splitStep.rejectionPath.map(step => step.id || 0)
            ];
            const newId = (Math.max(...existingIds, 0)) + 1;
    
            const newSubStep = {
                id: newId, // ✅ Always assign a valid unique ID
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


    module.exports = { getApprovalWorkflow, setWorkflowStructure, addStep, addSplitStep, addSubPathStep, editStep, deleteStep, approveKaizenIdea };
