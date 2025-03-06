const express = require("express");
const router = express.Router();
const  verifyEmployee  = require("../controllers/EmployeeVerificationController");

// Route to verify if an employee exists
router.get("/verify-employee", verifyEmployee);

module.exports = router;
