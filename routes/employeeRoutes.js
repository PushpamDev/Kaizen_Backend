const express = require("express");
const router = express.Router();
const { searchEmployeeByName } = require("../controllers/EmployeeController");

// Route to search employee by name
router.get("/search-employee", searchEmployeeByName);

module.exports = router;
