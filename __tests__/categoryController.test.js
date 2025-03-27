const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/CategoryModel");
const { listCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/CategoryController");

jest.mock("../models/CategoryModel");

const app = express();
app.use(express.json());
app.get("/categories", listCategories);
app.post("/categories", createCategory);
app.put("/categories/:id", updateCategory);
app.delete("/categories/:id", deleteCategory);

describe("Category Controller", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("listCategories should return categories", async () => {
        const mockCategories = [{ _id: "1", name: "Test Category" }];
        Category.find.mockResolvedValue(mockCategories);

        const res = await request(app).get("/categories");
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual(mockCategories);
    });

    test("createCategory should create a new category", async () => {
        const mockCategory = { _id: "1", name: "New Category" };

        // Mock `findOne` to return `null` (category does not exist)
        Category.findOne.mockResolvedValue(null);

        // Mock `Category` constructor and ensure `save()` returns the expected object
        Category.mockImplementation(function (data) {
            return {
                ...data,
                _id: "1", // Ensure `_id` is explicitly set
                save: jest.fn().mockResolvedValue(mockCategory), 
            };
        });

        const res = await request(app).post("/categories").send({ name: "New Category" });

        expect(res.status).toBe(201);
        expect(res.body.category).toEqual(mockCategory);
    });
    test("createCategory should return 400 if category exists", async () => {
        Category.findOne.mockResolvedValue({ name: "Existing Category" });

        const res = await request(app).post("/categories").send({ name: "Existing Category" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Category already exists");
    });

    test("updateCategory should update an existing category", async () => {
        Category.findByIdAndUpdate.mockResolvedValue({ _id: "1", name: "Updated Category" });

        const res = await request(app).put("/categories/1").send({ name: "Updated Category" });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Category updated successfully");
    });

    test("updateCategory should return 404 if category not found", async () => {
        Category.findByIdAndUpdate.mockResolvedValue(null);

        const res = await request(app).put("/categories/1").send({ name: "Updated Category" });
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
    });

    test("deleteCategory should delete an existing category", async () => {
        Category.findByIdAndDelete.mockResolvedValue({ _id: "1", name: "Deleted Category" });

        const res = await request(app).delete("/categories/1");
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Category deleted successfully");
    });

    test("deleteCategory should return 404 if category not found", async () => {
        Category.findByIdAndDelete.mockResolvedValue(null);

        const res = await request(app).delete("/categories/1");
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
    });
});
