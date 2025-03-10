const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const {
  getWorkflowForPlant,
  processApproval,
  createApprovalWorkflow,
  deleteApprovalWorkflow,
} = require("../controllers/ApprovalWorkflowController");

// 📌 Fetch workflow for a specific plant
router.get("/:plantCode", async (req, res) => {
    try {
        const workflow = await getWorkflowForPlant(req.params.plantCode);
        if (!workflow) return res.status(404).json({ message: "No workflow found for this plant." });
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ message: "Error fetching workflow: " + error.message });
    }
});


router.post("/approve/:registrationNumber", async (req, res) => {
  try {
    const { decision } = req.body;
    const { registrationNumber } = req.params;

    // ✅ Process approval
    const responseMessage = await processApproval(registrationNumber, decision);
    
    res.status(200).json(responseMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📌 Create a new approval workflow for a plant
router.post("/", async (req, res) => {
  try {
    const { plantCode, steps, updatedBy } = req.body;
    const newWorkflow = await createApprovalWorkflow(plantCode, steps, updatedBy);
    res.status(201).json(newWorkflow);
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

module.exports = router;
