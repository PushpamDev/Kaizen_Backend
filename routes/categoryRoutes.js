const express = require("express");
const { 
    listCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} = require("../controllers/CategoryController");

const router = express.Router();

// ✅ List all categories
router.get("/", listCategories);

// ✅ Create a new category
router.post("/", createCategory);

// ✅ Update a category
router.put("/:id", updateCategory);

// ✅ Delete a category
router.delete("/:id", deleteCategory);

module.exports = router;
