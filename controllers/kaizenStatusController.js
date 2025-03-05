const KaizenIdea = require("../models/KaizenIdea");

// Get Status Bar Data by Registration Number
const getKaizenStatusByRegNumber = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    // Find the Kaizen Idea by registration number
    const kaizenIdea = await KaizenIdea.findOne({ registrationNumber });

    if (!kaizenIdea) {
      return res.status(404).json({
        success: false,
        message: "Kaizen idea not found with this registration number",
      });
    }

    // Extract relevant data for the status bar
    const statusBarData = {
      currentStage: kaizenIdea.currentStage,
      isApproved: kaizenIdea.isApproved,
      stages: kaizenIdea.stages,
    };

    res.status(200).json({
      success: true,
      message: "Kaizen status retrieved successfully",
      statusBar: statusBarData,
    });
  } catch (error) {
    console.error("Error fetching Kaizen status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update Kaizen Status by Registration Number
const updateKaizenStatus = async (req, res) => {
    try {
      const { registrationNumber } = req.params;
      const { currentStage, isApproved, stages, status } = req.body;
  
      // Find the Kaizen Idea by registration number
      const kaizenIdea = await KaizenIdea.findOne({ registrationNumber });
  
      if (!kaizenIdea) {
        return res.status(404).json({
          success: false,
          message: "Kaizen idea not found with this registration number",
        });
      }
  
      // Update the status fields if provided
      if (currentStage !== undefined) kaizenIdea.currentStage = currentStage;
      if (isApproved !== undefined) kaizenIdea.isApproved = isApproved;
      if (stages !== undefined) kaizenIdea.stages = stages;
      if (status !== undefined) kaizenIdea.status = status;
  
      // Save the updated document
      await kaizenIdea.save();
  
      res.status(200).json({
        success: true,
        message: "Kaizen status updated successfully",
        updatedKaizen: kaizenIdea,
      });
    } catch (error) {
      console.error("Error updating Kaizen status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

module.exports = { getKaizenStatusByRegNumber , updateKaizenStatus };
