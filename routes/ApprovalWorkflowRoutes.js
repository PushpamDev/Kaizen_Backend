const express = require("express");
const router = express.Router();
const {
  getWorkflowForPlant,
  startApprovalProcess,
  processApproval,
  processConditionalApproval,
  createApprovalWorkflow,
  updateApprovalWorkflow,
  addSplitStep,
  addSubPath,
  deleteApprovalWorkflow,
} = require("../controllers/ApprovalWorkflowController");

// Fetch workflow for a specific plant
router.get("/:plantCode", async (req, res) => {
    try {
        const workflow = await getWorkflowForPlant(req.params.plantCode);
        if (!workflow) return res.status(404).json({ message: "No workflow found for this plant." });
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ message: "Error fetching workflow: " + error.message });
    }
});

// 📌 Start the approval process for a Kaizen idea
router.post("/start", async (req, res) => {
  try {
    const { registrationNumber, plantCode, suggesterEmail, kaizenData } = req.body;
    await startApprovalProcess(registrationNumber, plantCode, suggesterEmail, kaizenData);
    res.status(200).json({ message: "Approval process started successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Process an approval decision
router.post("/approve", async (req, res) => {
  try {
    const { registrationNumber, approverEmail, decision } = req.body;
    await processApproval(registrationNumber, approverEmail, decision);
    res.status(200).json({ message: "Approval decision processed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Process a conditional approval (with data updates)
router.patch("/conditional-approve", async (req, res) => {
  try {
    const { registrationNumber, approverEmail, decision, kaizenData } = req.body;
    await processConditionalApproval(registrationNumber, approverEmail, decision, kaizenData);
    res.status(200).json({ message: "Conditional approval processed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Create a new approval workflow for a plant
router.post("/", async (req, res) => {
  try {
    const { plantCode, steps } = req.body;
    const newWorkflow = await createApprovalWorkflow(plantCode, steps);
    res.status(201).json(newWorkflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Update an existing approval workflow
router.put("/update/:workflowId", async (req, res) => {
  try {
    const updatedWorkflow = await updateApprovalWorkflow(req.params.workflowId, req.body.steps);
    res.status(200).json(updatedWorkflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Delete an approval workflow
router.delete("/delete/:workflowId", async (req, res) => {
  try {
    await deleteApprovalWorkflow(req.params.workflowId);
    res.status(200).json({ message: "Workflow deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Add Split Step (Decision Point)
router.post("/:plantCode/split-step", async (req, res) => {
  try {
    await addSplitStep(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Add Sub-Path (Parallel Approval)
router.post("/:plantCode/sub-path", async (req, res) => {
  try {
    await addSubPath(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
