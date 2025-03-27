const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail } = require("../services/emailService");
const mongoose = require("mongoose");

const getWorkflowForPlant = async (plantCode) => {
    try {
      console.log("🔍 Fetching workflow for plant:", plantCode); // Debug log
      const workflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 }).lean().exec();
      
      if (!workflow) {
        console.log("⚠️ No workflow found for plant:", plantCode);
        return null; // Ensure null is returned, not undefined
      }
  
      console.log("✅ Workflow found:", workflow);
      return workflow;
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


// Process approval from any of the assigned approvers
const processApproval = async (registrationNumber, approverEmail, decision) => {
    try {
        console.log(`🔹 Processing approval for ${registrationNumber} by ${approverEmail}`);

        const kaizen = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizen) throw new Error("Kaizen idea not found.");

        if (kaizen.status === "Rejected") throw new Error("This Kaizen idea has already been rejected.");

        const plantCode = kaizen.plantCode;
        if (!plantCode) throw new Error("Plant code is missing from Kaizen Idea.");

        const workflow = await getWorkflowForPlant(plantCode);
        if (!workflow) throw new Error("Workflow not found for this plant.");

        // Find the current step where the approver exists
        const findStepRecursive = (steps, email) => {
            for (let step of steps) {
                if (step.approverEmails.includes(email)) return step;
                if (step.children && step.children.length > 0) {
                    const childStep = findStepRecursive(step.children, email);
                    if (childStep) return childStep;
                }
            }
            return null;
        };

        const currentStep = findStepRecursive(workflow.steps, approverEmail);
        if (!currentStep) throw new Error("Current approver not found in the workflow.");

        console.log("🔹 Current Step:", currentStep);

        // Check if this approver already approved/rejected
        const alreadyDecided = kaizen.approvalHistory.some(
            (entry) => entry.approverEmail === approverEmail
        );

        if (alreadyDecided) throw new Error("This approver has already submitted a decision for this step.");

        let updateFields = {};

        if (decision === "rejected") {
            updateFields.status = "Rejected";
            updateFields.isApproved = false;
            updateFields.currentApprovers = [];
        } else if (decision === "approved") {
            // Remove this approver from the list of pending approvers
            const remainingApprovers = kaizen.currentApprovers.filter(email => email !== approverEmail);

            if (remainingApprovers.length === 0) {
                // If all approvers at this step approved, move to the next step
                if (currentStep.children && currentStep.children.length > 0) {
                    const nextStep = currentStep.children[0]; // Move to the first child step
                    updateFields.currentApprovers = nextStep.approverEmails;
                    await Promise.all(nextStep.approverEmails.map((email) => sendApprovalEmail(email, kaizen)));
                } else {
                    // If no more steps, mark as fully approved
                    updateFields.status = "Approved";
                    updateFields.isApproved = true;
                    updateFields.currentApprovers = [];
                }
            } else {
                // More approvers are left in this step
                updateFields.currentApprovers = remainingApprovers;
            }
        }

        // Update Kaizen Idea with the new approval status
        await KaizenIdea.updateOne({ registrationNumber }, { $set: updateFields });

        // Log the approval decision in history
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $push: { approvalHistory: { approverEmail, decision, timestamp: new Date() } } }
        );

        console.log(`✅ Approval recorded: ${decision} by ${approverEmail}`);

        return { message: `Approval recorded. ${decision === "approved" ? "Next step in progress." : "Kaizen idea rejected."}` };

    } catch (error) {
        console.error("❌ Error processing approval:", error.message);
        throw new Error(error.message);
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
