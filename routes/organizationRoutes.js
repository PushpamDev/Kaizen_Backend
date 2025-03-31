// routes/organizationRoutes.js
const express = require("express");
const router = express.Router();
const { uploadLogo, getLogo } = require("../controllers/organizationController");

// Logo Routes (authMiddleware is already applied in logoController)
router.post("/upload-logo", uploadLogo);
router.get("/logo", getLogo);

module.exports = router;