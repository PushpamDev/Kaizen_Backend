const express = require("express");
const router = express.Router();
const {
  getWorkflowForPlant,
  processApproval,
  createApprovalWorkflow,
  deleteApprovalWorkflow,
} = require("../controllers/ApprovalWorkflowController");
const { authMiddleware, enforcePlantCode } = require("../middleware/authMiddleware"); 

//  Fetch workflow for the logged-in user's plant
router.get("/:plantCode", authMiddleware, async (req, res) => {
  try {
    const { plantCode } = req.params;
    const workflow = await getWorkflowForPlant(plantCode);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "No workflow found for this plant." });
    }

    // 🚀 Ensure we don’t access status anywhere
    const { status, ...workflowData } = workflow || {}; 

    res.json({ success: true, workflow: workflowData });
  } catch (error) {
    console.error(" Error fetching workflow:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching workflow",
      error: error.message || "Unknown error",
    });
  }
});


//  Process approval decision
router.post("/action/:registrationNumber", authMiddleware, enforcePlantCode, async (req, res) => {
  try {
      const { decision, approverEmail } = req.body; // 🔹 Get approverEmail from request body
      const { registrationNumber } = req.params;

      console.log("📥 Request Body:", req.body); // Debug log

      if (!approverEmail) {
          console.error(" Missing approverEmail in request body");
          return res.status(400).json({ message: "Approver email is required." });
      }
      if (!decision) {
          console.error(" Missing decision in request body");
          return res.status(400).json({ message: "Decision is required." });
      }

      const responseMessage = await processApproval(registrationNumber, approverEmail, decision);
      res.status(200).json(responseMessage);
  } catch (error) {
      console.error(" Route Error:", error);
      res.status(500).json({ message: error.message });
  }
});

//  Create/Update approval workflow for logged-in user's plant
router.post("/", authMiddleware, enforcePlantCode, createApprovalWorkflow);

//  Delete an approval workflow
router.delete("/delete/:workflowId", authMiddleware, enforcePlantCode, async (req, res) => {
  try {
    await deleteApprovalWorkflow(req.params.workflowId);
    res.status(200).json({ message: "Workflow deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
