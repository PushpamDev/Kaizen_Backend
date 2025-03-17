const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail } = require("../services/emailService");
const mongoose = require("mongoose");

// Fetch the latest workflow for a specific plant
const getWorkflowForPlant = async (plantCode) => {
    return await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 }).lean();
};

const startApprovalProcess = async (registrationNumber, plantCode, kaizenData) => {
    try {
        console.log("🔹 Starting approval process for:", { registrationNumber, plantCode });

        const workflow = await getWorkflowForPlant(plantCode);
        console.log("🔹 Retrieved workflow:", workflow);

        if (!workflow) throw new Error("No workflow found for this plant.");

        let firstStep = workflow.steps.find((step) => !step.parentStepId);
        console.log("🔹 First step found:", firstStep);

        if (!firstStep) throw new Error("Workflow is incorrectly configured.");

        // ✅ Fix: Handle both `approverEmails` (array) and `approverEmail` (single string)
        let nextApprover = Array.isArray(firstStep.approverEmails) 
            ? firstStep.approverEmails[0] 
            : firstStep.approverEmail || null;

        console.log("🔹 Next approver:", nextApprover);

        if (!nextApprover) {
            console.error("❌ First approver email is missing. Step details:", firstStep);
            throw new Error("First approver email is missing.");
        }

        // ✅ Assign the first approver
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $set: { currentApprover: nextApprover, status: "Pending Approval" } }
        );

        console.log("✅ Assigned first approver:", nextApprover);

        // ✅ Send Approval Email Only (No submission email to the suggester)
        await sendApprovalEmail(nextApprover, kaizenData);
        console.log("✅ Approval email sent to:", nextApprover);

    } catch (error) {
        console.error("❌ Error starting approval process:", error.message);
    }
};


// Start the approval process
const processApproval = async (registrationNumber, approverEmail, decision) => {
    try {
        console.log(`🔹 Processing approval for ${registrationNumber} by ${approverEmail}`);

        const kaizen = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizen) throw new Error("Kaizen idea not found.");

        if (kaizen.status === "Rejected") {
            throw new Error("This Kaizen idea has already been rejected.");
        }

        const plantCode = kaizen.plantCode;
        if (!plantCode) throw new Error("Plant code is missing from Kaizen Idea.");

        const workflow = await getWorkflowForPlant(plantCode);
        if (!workflow) throw new Error("Workflow not found for this plant.");

        // 🔍 Find the current approval step based on approverEmail
        const findStepRecursive = (steps, email) => {
            for (let step of steps) {
                let approvers = Array.isArray(step.approverEmails) ? step.approverEmails : [step.approverEmail];

                if (approvers.includes(email)) {
                    return step;
                }
                if (step.children && step.children.length > 0) {
                    const childStep = findStepRecursive(step.children, email);
                    if (childStep) return childStep;
                }
            }
            return null;
        };

        const currentStep = findStepRecursive(workflow.steps, approverEmail);
        if (!currentStep) {
            console.error("🚨 Approver not found! Approver:", approverEmail);
            throw new Error("Current approver not found in the workflow.");
        }

        console.log("🔹 Current Step:", currentStep);

        // ✅ Check if this approver already approved this step
        const alreadyApproved = kaizen.approvalHistory.some(
            (entry) => entry.approverEmail === approverEmail && entry.decision === "approved"
        );

        if (alreadyApproved) {
            throw new Error("This Kaizen idea has already been approved at this step.");
        }

        let updateFields = {};
        let nextApproverEmail = null;

        if (decision === "approved") {
            // 🔍 Find the next approver in the hierarchy
            if (currentStep.children && currentStep.children.length > 0) {
                const nextStep = currentStep.children[0]; // First child step
                console.log("🔹 Next Step:", nextStep);

                updateFields.currentApprover = nextStep.approverEmails ? nextStep.approverEmails[0] : nextStep.approverEmail;
                nextApproverEmail = updateFields.currentApprover;

                // ✅ Notify the next approver
                if (nextApproverEmail) {
                    await sendApprovalEmail(nextApproverEmail, kaizen);
                }
            } else {
                // ✅ If no more steps, mark as fully approved
                updateFields.status = "Approved";
                updateFields.isApproved = true;
                updateFields.currentApprover = null;
            }
        } else if (decision === "rejected") {
            updateFields.status = "Rejected";
            updateFields.isApproved = false;
            updateFields.currentApprover = null;
        }

        // ✅ Update Kaizen Idea with new approval status
        await KaizenIdea.updateOne({ registrationNumber }, { $set: updateFields });

        // ✅ Log approval decision in history
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $push: { approvalHistory: { approverEmail, decision, timestamp: new Date() } } }
        );

        console.log(`✅ Processed approval: ${decision} by ${approverEmail}`);

        return nextApproverEmail
            ? { message: `Approval recorded. Waiting for approval from ${nextApproverEmail}` }
            : { message: `Kaizen idea approved successfully!` };

    } catch (error) {
        console.error("❌ Error processing approval:", error.message);
        throw new Error(error.message);
    }
};

// Create or Update an approval workflow
const createApprovalWorkflow = async (plantCode, steps, updatedBy) => {
    try {
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            throw new Error("Approval workflow must have at least one step.");
        }

        let workflow = await ApprovalWorkflow.findOne({ plantCode });

        if (workflow) {
            if (workflow.history.length >= 5) {
                workflow.history.shift();
            }
            workflow.history.push({
                version: workflow.version,
                changes: "Updated approval steps",
                updatedBy,
                updatedAt: new Date(),
            });

            workflow.steps = steps;
            workflow.version += 1;
        } else {
            workflow = new ApprovalWorkflow({ 
                plantCode, 
                steps, 
                version: 1 
            });
        }

        await workflow.save();

        return {
            plantCode: workflow.plantCode,
            version: workflow.version,
            steps: workflow.steps,
            history: workflow.history,
        };
    } catch (error) {
        throw new Error("Error creating/updating approval workflow: " + error.message);
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