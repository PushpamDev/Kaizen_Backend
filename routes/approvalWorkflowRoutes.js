const express = require("express");
const {
    getApprovalWorkflow,
    setWorkflowStructure, // ✅ Allows the plant head to set approval steps & hierarchy
    addStep,
    editStep,
    deleteStep,
    addSplitStep,  // ✅ Added missing comma
    addSubPathStep // ✅ Removed extra comma
} = require("../controllers/approvalWorkflowController");

const router = express.Router();

// Get workflow for a specific plant
router.get("/:plantCode", getApprovalWorkflow);

// ✅ Allow plant head (admin) to configure workflow structure (steps & hierarchy)
router.post("/:plantCode/settings", setWorkflowStructure);

// Add a step to a specific plant's workflow
router.post("/:plantCode/steps", addStep);

// Edit a step in a specific plant's workflow
router.put("/:plantCode/steps/:id", editStep);

// Add a split step (decision point)
router.post("/:plantCode/split-steps", addSplitStep);

// Add a sub-path step under a split step
router.post("/:plantCode/split-steps/:id/sub-steps", addSubPathStep);

// Delete a step from a specific plant's workflow
router.delete("/:plantCode/steps/:id", deleteStep);

module.exports = router;
