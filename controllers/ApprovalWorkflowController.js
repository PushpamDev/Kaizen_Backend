const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail } = require("../services/emailService");
const mongoose = require("mongoose");

const getWorkflowForPlant = async (plantCode) => {
    try {
        console.log("🔍 Fetching workflow for plant:", plantCode); // Debug log

        const workflow = await ApprovalWorkflow.find({ plantCode })
            .sort({ version: -1 })
            .limit(1);

        if (workflow.length === 0) {
            console.log("⚠️ No workflow found for plant:", plantCode);
            return null; // Ensure null is returned, not undefined
        }

        console.log("✅ Workflow found:", workflow[0]); // Return the first (and only) element
        return workflow[0];
    } catch (error) {
        console.error("❌ Error in getWorkflowForPlant:", error);
        throw new Error("Database query failed"); // Handle errors properly
    }
};

const startApprovalProcess = async (registrationNumber, plantCode, kaizenData) => {
    try {
        console.log("🔹 Starting approval process for:", { registrationNumber, plantCode });

        const workflow = await getWorkflowForPlant(plantCode);
        console.log("🔍 Workflow retrieved in startApprovalProcess:", workflow);

        if (!workflow || !workflow.steps || workflow.steps.length === 0) {
            console.error("🚨 No workflow found or steps missing!");
            throw new Error("No workflow found for this plant or steps are missing.");
        }

        // ✅ Find first step explicitly
        const firstStep = workflow.steps.find((step) => step.stepId === "1") || workflow.steps[0];
        console.log("🔍 Extracted First Step:", JSON.stringify(firstStep, null, 2));

        if (!firstStep) {
            console.error("🚨 First step not found in workflow!");
            throw new Error("Workflow is incorrectly configured. First step not found.");
        }

        // ✅ Check if approvers exist
        if (!Array.isArray(firstStep.approverEmails)) {
            console.error("🚨 approverEmails is NOT an array!", firstStep.approverEmails);
        }

        const nextApprovers = (firstStep.approverEmails || []).map(email => email.trim()).filter(email => email.length > 0);
        console.log("📧 Approvers in First Step:", nextApprovers);

        if (nextApprovers.length === 0) {
            console.error("🚨 No approvers found for the first step!");
            throw new Error("No approvers assigned for the first step.");
        }

        // ✅ Assign first step approvers
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $set: { currentApprovers: nextApprovers, status: "Pending Approval" } }
        );

        console.log("✅ First step approvers assigned:", nextApprovers);

        // ✅ Send approval emails
        await Promise.all(nextApprovers.map(email => sendApprovalEmail(email, kaizenData)));

        console.log("✅ Approval emails sent to:", nextApprovers);

    } catch (error) {
        console.error("❌ Error in startApprovalProcess:", error.message);
        throw new Error(error.message);
    }
};

// Process approval where one approval moves to the next step
const processApproval = async (registrationNumber, approverEmail, decision) => {
    try {
        console.log(`🔹 Processing approval for ${registrationNumber} by ${approverEmail}`);

        // Fetch the Kaizen idea from DB
        const kaizen = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizen) {
            console.error("❌ Error: Kaizen idea not found for registration number:", registrationNumber);
            throw new Error("Kaizen idea not found.");
        }

        console.log("📋 Kaizen Document:", {
            currentStage: kaizen.currentStage,
            currentApprovers: kaizen.currentApprovers,
            status: kaizen.status
        });

        if (kaizen.status === "Rejected") {
            console.error("❌ Error: Kaizen idea is already rejected.");
            throw new Error("This Kaizen idea has already been rejected.");
        }

        const plantCode = kaizen.plantCode;
        if (!plantCode) {
            console.error("❌ Error: Missing plant code in Kaizen Idea.");
            throw new Error("Plant code is missing from Kaizen Idea.");
        }

        const workflow = await getWorkflowForPlant(plantCode);
        if (!workflow) {
            console.error(`❌ Error: No workflow found for plant ${plantCode}`);
            throw new Error("Workflow not found for this plant.");
        }

        // Find the current step based on kaizen.currentStage
        const findStepByStage = (steps, stage, currentDepth = 0) => {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const currentStage = currentDepth + i;
                if (currentStage === stage) {
                    return { step, stage: currentStage };
                }
                if (step.children && step.children.length > 0) {
                    const childResult = findStepByStage(step.children, stage, currentDepth + 1);
                    if (childResult) return childResult;
                }
            }
            return null;
        };

        const currentStage = kaizen.currentStage || 0; // Default to 0 if not set
        const stepResult = findStepByStage(workflow.steps, currentStage);
        if (!stepResult) {
            console.error("❌ Error: No step found for stage", currentStage, "in workflow.");
            throw new Error("Current step not found in workflow.");
        }

        const { step: currentStep } = stepResult;
        console.log("🔹 Current Step from Workflow:", {
            stage: currentStage,
            approvers: currentStep.approverEmails
        });

        // Validate approver is in current step
        if (!currentStep.approverEmails.includes(approverEmail)) {
            console.error("❌ Error: Approver", approverEmail, "not assigned to stage", currentStage);
            throw new Error("You are not an approver for the current step.");
        }

        // Check if this approver has already decided for THIS STEP
        const alreadyDecided = kaizen.approvalHistory.some(
            (entry) => entry.approverEmail === approverEmail && entry.stage === currentStage
        );

        if (alreadyDecided) {
            console.error("❌ Error: Duplicate approval attempt by", approverEmail, "at stage", currentStage);
            throw new Error("This approver has already submitted a decision for this step.");
        }

        let updateFields = {};

        if (decision === "rejected") {
            console.log(`🔻 ${approverEmail} rejected the Kaizen idea at stage ${currentStage}`);
            updateFields.status = "Rejected";
            updateFields.isApproved = false;
            updateFields.currentApprovers = [];
            updateFields.currentStage = currentStage;
        } else if (decision === "approved") {
            console.log(`✅ ${approverEmail} approved the Kaizen idea at stage ${currentStage}`);

            // Move to the next step immediately upon approval
            if (currentStep.children && currentStep.children.length > 0) {
                const nextStep = currentStep.children[0];
                updateFields.currentApprovers = nextStep.approverEmails;
                updateFields.currentStage = currentStage + 1;

                console.log("🔄 Moving to next step (stage", currentStage + 1, ") with approvers:", nextStep.approverEmails);

                // Send email to next approvers
                await Promise.all(nextStep.approverEmails.map((email) => sendApprovalEmail(email, kaizen)));
            } else {
                // No more steps, mark as fully approved
                console.log(`🏆 Kaizen ${registrationNumber} fully approved.`);
                updateFields.status = "Approved";
                updateFields.isApproved = true;
                updateFields.currentApprovers = [];
                updateFields.currentStage = currentStage;
            }
        }

        // Update Kaizen Idea with the new approval status
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $set: updateFields }
        );

        // Log approval in history with stage
        await KaizenIdea.updateOne(
            { registrationNumber },
            {
                $push: {
                    approvalHistory: {
                        approverEmail,
                        decision,
                        stage: currentStage,
                        timestamp: new Date()
                    }
                }
            }
        );

        console.log(`✅ Approval recorded: ${decision} by ${approverEmail} at stage ${currentStage}`);

        let message;
        if (decision === "rejected") {
            message = "Kaizen idea rejected.";
        } else if (decision === "approved") {
            if (currentStep.children && currentStep.children.length > 0) {
                message = "Approval recorded. Moved to next step.";
            } else {
                message = "Kaizen idea fully approved.";
            }
        }

        return { success: true, message };
    } catch (error) {
        console.error("❌ Error processing approval:", error);
        return { success: false, error: error.message };
    }
};
// Create or Update an approval workflow, allowing multiple approvers per step
const createApprovalWorkflow = async (req, res) => {
    try {
        const { steps } = req.body;
        const updatedBy = req.user.email; // Extract user email from JWT
        const plantCode = req.user.plantCode; // Extract plantCode from JWT

        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ success: false, message: "Approval workflow must have at least one step." });
        }

        let workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (workflow) {
            if (!workflow.history) workflow.history = [];

            if (workflow.history.length >= 5) {
                workflow.history.shift();
            }

            workflow.history.push({
                version: workflow.version || 1,
                changes: "Updated approval steps",
                updatedBy,
                updatedAt: new Date(),
            });

            workflow.steps = steps;
            workflow.version = (workflow.version || 0) + 1;
        } else {
            workflow = new ApprovalWorkflow({
                plantCode,
                steps,
                version: 1,
                history: [],
            });
        }

        await workflow.save();

        return res.status(200).json({
            success: true,
            message: "Approval workflow created/updated successfully.",
            workflow: {
                plantCode: workflow.plantCode,
                version: workflow.version,
                steps: workflow.steps,
                history: workflow.history,
            },
        });
    } catch (error) {
        console.error("❌ Error in createApprovalWorkflow:", error.message);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};




// Delete an approval workflow
const deleteApprovalWorkflow = async (workflowId) => {
    try {
        const workflow = await ApprovalWorkflow.findById(workflowId);
        if (!workflow) throw new Error("Workflow not found");

        return await ApprovalWorkflow.findByIdAndDelete(workflowId);
    } catch (error) {
        throw new Error("Error deleting approval workflow: " + error.message);
    }
};

module.exports = {
    getWorkflowForPlant,
    startApprovalProcess,
    processApproval,
    createApprovalWorkflow,
    deleteApprovalWorkflow
};
