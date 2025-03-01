const Category = require("../models/CategoryModel");

// ✅ List Categories
const listCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json({ items: categories });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ Create Category (with duplicate check)
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Category name is required" });

        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) return res.status(400).json({ message: "Category already exists" });

        const category = new Category({ name });
        await category.save();

        res.status(201).json({
            message: "Category created successfully",
            category,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ Update Category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(id, { name, isActive }, { new: true });
        if (!updatedCategory) return res.status(404).json({ message: "Category not found" });

        res.json({ message: "Category updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ Delete Category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) return res.status(404).json({ message: "Category not found" });

        res.json({ message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
