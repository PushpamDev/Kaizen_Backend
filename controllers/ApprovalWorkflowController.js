const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail, sendKaizenSubmissionEmail } = require("../services/emailService");
const mongoose = require("mongoose");

// 📌 Fetch workflow for a specific plant
const getWorkflowForPlant = async (plantCode) => {
    return await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
};

// 📌 Start the approval process when a Kaizen idea is submitted
const startApprovalProcess = async (registrationNumber, plantCode, suggesterEmail, kaizenData) => {
    try {
      const workflow = await getWorkflowForPlant(plantCode);
      if (!workflow) throw new Error("No workflow found for this plant.");
  
      const firstStep = workflow.steps.find((step) => step.order === 1);
      if (!firstStep) throw new Error("Workflow is incorrectly configured.");
  
      // Assign the first approver
      await KaizenIdea.updateOne(
        { registrationNumber },
        { $set: { currentApprover: firstStep.approverEmail, status: "Pending Approval" } }
      );
  
      // Send Email Notifications
      sendKaizenSubmissionEmail(suggesterEmail, kaizenData); // Notify submitter
      sendApprovalEmail(firstStep.approverEmail, kaizenData); // Notify first approver
    } catch (error) {
      console.error("Error starting approval process:", error.message);
    }
};

// 📌 Process an approval decision
const processApproval = async (registrationNumber, approverEmail, decision) => {
    try {
        console.log("Processing approval for:", registrationNumber);

        const kaizen = await KaizenIdea.findOne({ registrationNumber });
        if (!kaizen) throw new Error("Kaizen idea not found.");
        
        // ✅ Ensure plantCode is retrieved correctly
        const plantCode = kaizen.plantCode;
        if (!plantCode) throw new Error("plantCode is missing from Kaizen Idea.");

        console.log("Fetching approval workflow for plant:", plantCode);

        const workflow = await getWorkflowForPlant(plantCode);
        if (!workflow) throw new Error("Workflow not found for this plant.");

        const currentStep = workflow.steps.find((step) => step.approverEmail === approverEmail);
        if (!currentStep) throw new Error("Approver is not part of the workflow.");

        if (decision === "approved") {
            const nextStep = workflow.steps.find((step) => step.order === currentStep.order + 1);

            if (nextStep) {
                // ✅ Move to the next approver
                await KaizenIdea.updateOne({ registrationNumber }, { 
                    $set: { currentApprover: nextStep.approverEmail } 
                });
                sendApprovalEmail(nextStep.approverEmail, kaizen); // Notify next approver
            } else {
                // ✅ Final approval
                await KaizenIdea.updateOne({ registrationNumber }, { 
                    $set: { status: "Approved", isApproved: true, currentApprover: null } 
                });
            }
        } else if (decision === "rejected") {
            // ❌ Mark as rejected
            await KaizenIdea.updateOne({ registrationNumber }, { 
                $set: { status: "Rejected", isApproved: false, currentApprover: null } 
            });
        }

        // ✅ Add to approval history
        await KaizenIdea.updateOne(
            { registrationNumber },
            { $push: { approvalHistory: { approver: approverEmail, status: decision, timestamp: new Date() } } }
        );
    } catch (error) {
        console.error("Error processing approval:", error.message);
    }
};


// 📌 Handle decision points (conditional approvals)
const processConditionalApproval = async (registrationNumber, approverEmail, decision, kaizenData) => {
  try {
    const kaizen = await KaizenIdea.findOne({ registrationNumber });
    if (!kaizen) throw new Error("Kaizen idea not found.");

    const workflow = await getWorkflowForPlant(kaizen.plantCode);
    if (!workflow) throw new Error("Workflow not found for this plant.");

    const currentStep = workflow.steps.find((step) => step.approverEmail === approverEmail);
    if (!currentStep) throw new Error("Approver is not part of the workflow.");

    if (decision === "approved") {
      const conditionalStep = workflow.steps.find(
        (step) => step.conditions?.costThreshold && kaizenData.cost >= step.conditions.costThreshold
      );

      if (conditionalStep) {
        await KaizenIdea.updateOne({ registrationNumber }, { $set: { currentApprover: conditionalStep.approverEmail } });
        sendApprovalEmail(conditionalStep.approverEmail, kaizenData);
      } else {
        processApproval(registrationNumber, approverEmail, "approved");
      }
    } else {
      await KaizenIdea.updateOne({ registrationNumber }, { $set: { status: "Rejected" } });
    }
  } catch (error) {
    console.error("Error processing conditional approval:", error.message);
  }
};

// 📌 Create a new approval workflow
const createApprovalWorkflow = async (plantCode, steps) => {
    try {
        const newWorkflow = new ApprovalWorkflow({ plantCode, steps });
        await newWorkflow.save();
        return newWorkflow;
    } catch (error) {
        throw new Error("Error creating approval workflow: " + error.message);
    }
};

// 📌 Update an existing approval workflow
const updateApprovalWorkflow = async (workflowId, steps) => {
    try {
        const updatedWorkflow = await ApprovalWorkflow.findByIdAndUpdate(
            workflowId,
            { $set: { steps } },
            { new: true }
        );
        if (!updatedWorkflow) throw new Error("Workflow not found");
        return updatedWorkflow;
    } catch (error) {
        throw new Error("Error updating approval workflow: " + error.message);
    }
};

// 📌 Delete an approval workflow
const deleteApprovalWorkflow = async (workflowId) => {
    try {
        const deletedWorkflow = await ApprovalWorkflow.findByIdAndDelete(workflowId);
        if (!deletedWorkflow) throw new Error("Workflow not found");
        return deletedWorkflow;
    } catch (error) {
        throw new Error("Error deleting approval workflow: " + error.message);
    }
};

// 📌 Add a SplitStep (Decision Point)
const addSplitStep = async (req, res) => {
    const { plantCode } = req.params;
    const { order, condition, decisionPoints } = req.body;
  
    try {
      const workflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
      if (!workflow) return res.status(404).json({ message: "Workflow not found for this plant." });
  
      // Validate input
      if (!condition || !decisionPoints || typeof decisionPoints !== "object") {
        return res.status(400).json({ message: "Invalid decision points format." });
      }
  
      // Shift all steps forward to maintain order
      workflow.steps.forEach((step) => {
        if (step.order >= order) step.order += 1;
      });
  
      // Insert the SplitStep
      workflow.steps.splice(order - 1, 0, {
        stepId: new mongoose.Types.ObjectId(),
        role: "SplitStep",
        type: "splitStep",
        condition,
        decisionPoints,
        order,
      });
  
      await workflow.save();
      res.status(201).json({ message: "SplitStep added successfully!", workflow });
    } catch (error) {
      res.status(500).json({ message: "Error adding SplitStep: " + error.message });
    }
  };
    
    // 📌 Add a SubPath (Parallel Approval Step)
    const addSubPath = async (req, res) => {
      const { plantCode } = req.params;
      const { parentStepId, subPathSteps } = req.body; // subPathSteps: Array of parallel approvers
    
      try {
        const workflow = await ApprovalWorkflow.findOne({ plantCode }).sort({ version: -1 });
        if (!workflow) return res.status(404).json({ message: "Workflow not found for this plant." });
    
        const parentStep = workflow.steps.find((step) => step.stepId.toString() === parentStepId);
        if (!parentStep) return res.status(400).json({ message: "Parent step not found in workflow." });
    
        // Validate subPathSteps array
        if (!Array.isArray(subPathSteps) || subPathSteps.length === 0) {
          return res.status(400).json({ message: "Invalid subPath steps provided." });
        }
    
        // Attach subPath under the selected parent step
        if (!parentStep.subPaths) parentStep.subPaths = [];
        parentStep.subPaths.push(
          ...subPathSteps.map((step) => ({
            ...step,
            stepId: new mongoose.Types.ObjectId(),
            type: "subPath",
          }))
        );
    
        await workflow.save();
        res.status(201).json({ message: "SubPath added successfully!", workflow });
      } catch (error) {
        res.status(500).json({ message: "Error adding SubPath: " + error.message });
      }
    };
  
    // 📌 Export controller functions
     module.exports = {
    getWorkflowForPlant,
    startApprovalProcess,
    processApproval,
    processConditionalApproval,
    createApprovalWorkflow,
    updateApprovalWorkflow,
    addSplitStep,
    addSubPath,
    deleteApprovalWorkflow
  };
  
