const express = require("express");
const router = express.Router();
const { searchEmployeeByNameOrCode } = require("../controllers/EmployeeController");

// Route to search employee by name
router.get("/search-employee", searchEmployeeByNameOrCode);

module.exports = router;
