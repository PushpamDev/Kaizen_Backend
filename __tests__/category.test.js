const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Category = require("../models/CategoryModel");
let mongoServer;

// Setup in-memory MongoDB before running tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
    await Category.deleteMany();
});

// Close MongoDB connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("Category Schema", () => {
    test("should create a category with valid data", async () => {
        const category = new Category({ name: "Electronics" });
        const savedCategory = await category.save();

        expect(savedCategory._id).toBeDefined();
        expect(savedCategory.name).toBe("Electronics");
        expect(savedCategory.isActive).toBe(true); // Default value
    });

    test("should fail validation when name is missing", async () => {
        const category = new Category({}); // Missing name

        await expect(category.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should enforce unique name constraint", async () => {
        await Category.create({ name: "Books" });

        await expect(
            Category.create({ name: "Books" }) // Duplicate name
        ).rejects.toThrow();
    });

    test("should allow setting isActive to false", async () => {
        const category = new Category({ name: "Clothing", isActive: false });
        const savedCategory = await category.save();

        expect(savedCategory.isActive).toBe(false);
    });
});
