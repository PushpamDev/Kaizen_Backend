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


const processApproval = async (registrationNumber, approverEmail, decision) => {
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

        const currentStep = workflow.steps.find(step => step.approverEmail === approverEmail);
        if (!currentStep) {
            throw new Error(`Approver ${approverEmail} is not part of the workflow.`);
        }

        console.log("🔹 Current Step:", currentStep);

        let updateFields = {};
        let responseMessage = "";

        if (decision === "approved") {
            // ✅ Find the next step based on children
            const nextStep = workflow.steps.find(
                step => step.stepId === currentStep.children[0] // Get the first child step
            );

            console.log("🔹 Next Step:", nextStep);

            if (nextStep) {
                // ✅ Move to the next approver
                updateFields.currentApprover = nextStep.approverEmail;
                sendApprovalEmail(nextStep.approverEmail, kaizen);
                responseMessage = `Approval recorded. Waiting for approval from ${nextStep.approverEmail}`;
            } else {
                // ✅ If no next step, mark as fully approved
                updateFields.status = "Approved";
                updateFields.isApproved = true;
                updateFields.currentApprover = null;
                responseMessage = "Kaizen idea has been fully approved!";
            }
        } else if (decision === "rejected") {
            updateFields.status = "Rejected";
            updateFields.isApproved = false;
            updateFields.currentApprover = null;
            responseMessage = "Kaizen idea has been rejected.";
        }

        await KaizenIdea.updateOne({ registrationNumber }, { $set: updateFields });
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $push: { approvalHistory: { approverEmail, decision, timestamp: new Date() } } }
        );

        console.log(`✅ Processed approval: ${decision} by ${approverEmail}`);

        return responseMessage; // ✅ Return the custom message

    } catch (error) {
        console.error("🚨 Error processing approval:", error.message);
        throw new Error(error.message);
    }
};


  

// 📌 Create or update an approval workflow
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
          workflow = new ApprovalWorkflow({ plantCode, steps });
      }

      await workflow.save();
      return workflow;
  } catch (error) {
      throw new Error("Error creating/updating approval workflow: " + error.message);
  }
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
