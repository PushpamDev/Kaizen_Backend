const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail } = require("../services/emailService");
const mongoose = require("mongoose");

// 📌 Fetch workflow for a specific plant
const getWorkflowForPlant = async (plantCode) => {
    return await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
};

const startApprovalProcess = async (registrationNumber, plantCode, kaizenData) => {
  try {
      const workflow = await getWorkflowForPlant(plantCode);
      if (!workflow) throw new Error("No workflow found for this plant.");

      let firstStep = workflow.steps.find((step) => !step.parentStepId);
      if (!firstStep) throw new Error("Workflow is incorrectly configured.");

      let nextApprover = firstStep.approverEmail;
      
      // ✅ Assign the first approver
      await KaizenIdea.updateOne(
          { registrationNumber },
          { $set: { currentApprover: nextApprover, status: "Pending Approval" } }
      );

      console.log("✅ Assigned first approver:", nextApprover);

      // ✅ Send Approval Email Only (No submission email to the suggester)
      await sendApprovalEmail(nextApprover, kaizenData);

  } catch (error) {
      console.error("❌ Error starting approval process:", error.message);
  }
};


const processApproval = async (registrationNumber, decision) => {
    try {
        const kaizen = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizen) throw new Error("Kaizen idea not found.");
  
        if (kaizen.status === "Rejected") {
            throw new Error("This Kaizen idea has already been rejected.");
        }

        const plantCode = kaizen.plantCode;
        if (!plantCode) throw new Error("plantCode is missing from Kaizen Idea.");

        const workflow = await getWorkflowForPlant(plantCode);
        if (!workflow) throw new Error("Workflow not found for this plant.");

        // ✅ Find the current approver (who needs to approve the idea now)
        const currentStep = workflow.steps.find(step => step.approverEmail === kaizen.currentApprover);
        if (!currentStep) {
            throw new Error(`Current approver not found in the workflow.`);
        }

        console.log("🔹 Current Step:", currentStep);

        let updateFields = {};
        let nextApproverEmail = null;

        if (decision === "approved") {
            // ✅ Find the next step based on children
            const nextStep = workflow.steps.find(step => step.stepId === currentStep.children[0]); // First child step
            console.log("🔹 Next Step:", nextStep);

            if (nextStep) {
                // ✅ Move to the next approver
                updateFields.currentApprover = nextStep.approverEmail;
                nextApproverEmail = nextStep.approverEmail;
                sendApprovalEmail(nextStep.approverEmail, kaizen);
            } else {
                // ✅ If no next step, mark as fully approved
                updateFields.status = "Approved";
                updateFields.isApproved = true;
                updateFields.currentApprover = null;
            }
        } else if (decision === "rejected") {
            updateFields.status = "Rejected";
            updateFields.isApproved = false;
            updateFields.currentApprover = null;
        }

        await KaizenIdea.updateOne({ registrationNumber }, { $set: updateFields });
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $push: { approvalHistory: { approverEmail: currentStep.approverEmail, decision, timestamp: new Date() } } }
        );

        console.log(`✅ Processed approval: ${decision} by ${currentStep.approverEmail}`);

        return nextApproverEmail 
            ? { message: `Approval recorded. Waiting for approval from ${nextApproverEmail}` }
            : { message: `Kaizen idea ${decision} successfully!` };

    } catch (error) {
        console.error("🚨 Error processing approval:", error.message);
        throw new Error(error.message);
    }
};



  

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
            workflow = new ApprovalWorkflow({ plantCode, steps, version: 1 });
        }

        await workflow.save();

        // 🔥 Format steps into a nested structure before returning
        const nestedSteps = buildNestedSteps(workflow.steps);

        return {
            plantCode: workflow.plantCode,
            version: workflow.version,
            steps: nestedSteps,
            history: workflow.history,
        };
    } catch (error) {
        throw new Error("Error creating/updating approval workflow: " + error.message);
    }
};

// 📌 Helper function to build a nested tree from steps
const buildNestedSteps = (steps) => {
    const stepMap = new Map();
    const rootSteps = [];

    // First pass: Create a map of all steps
    steps.forEach(step => stepMap.set(step._id.toString(), { ...step.toObject(), children: [] }));

    // Second pass: Assign children to their respective parents
    stepMap.forEach((step) => {
        if (step.parentStepId) {
            const parent = stepMap.get(step.parentStepId.toString());
            if (parent) {
                parent.children.push(step);
            }
        } else {
            rootSteps.push(step);
        }
    });

    return rootSteps;
};


// 📌 Delete an approval workflow
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
