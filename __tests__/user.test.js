const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { User , rolePermissions } = require("../models/UserModel");

let mongoServer;

// Setup in-memory MongoDB before running tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
    await User.deleteMany();
});

// Close MongoDB connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("User Schema", () => {
    test("should create a user with valid data", async () => {
        const user = new User({
            name: "John Doe",
            email: "john.doe@example.com",
            password: "SecurePass123",
            role: "admin",
            plantCode: "PLANT01"
        });

        const savedUser = await user.save();

        expect(savedUser._id).toBeDefined();
        expect(savedUser.email).toBe("john.doe@example.com");
        expect(savedUser.role).toBe("admin");
        expect(savedUser.permissions).toEqual(rolePermissions["admin"]);
    });

    test("should fail validation if email format is invalid", async () => {
        const user = new User({
            name: "Jane Doe",
            email: "invalid-email",
            password: "Pass123!",
            role: "user",
            plantCode: "PLANT02"
        });

        await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should enforce unique email per plantCode", async () => {
        await User.create({
            name: "Alice",
            email: "alice@example.com",
            password: "Password123",
            role: "user",
            plantCode: "PLANT01"
        });

        await expect(
            User.create({
                name: "Bob",
                email: "alice@example.com", // Same email
                password: "Password123",
                role: "admin",
                plantCode: "PLANT01" // Same plantCode (should fail)
            })
        ).rejects.toThrow();
    });

    test("should allow the same email in different plants", async () => {
        await User.create({
            name: "Charlie",
            email: "charlie@example.com",
            password: "Pass@123",
            role: "user",
            plantCode: "PLANT01"
        });

        const userInAnotherPlant = await User.create({
            name: "Charlie Again",
            email: "charlie@example.com", // Same email
            password: "Pass@456",
            role: "admin",
            plantCode: "PLANT02" // Different plantCode (should pass)
        });

        expect(userInAnotherPlant._id).toBeDefined();
    });

    test("should auto-assign permissions based on role", async () => {
        const user = new User({
            name: "Eve",
            email: "eve@example.com",
            password: "Pass@789",
            role: "approver",
            plantCode: "PLANT03"
        });

        const savedUser = await user.save();
        expect(savedUser.permissions).toEqual(rolePermissions["approver"]);
    });

    test("should update permissions when role changes", async () => {
        const user = new User({
            name: "Frank",
            email: "frank@example.com",
            password: "SecretPass",
            role: "user",
            plantCode: "PLANT04"
        });

        await user.save();

        // Change role
        user.role = "super admin";
        await user.save();

        expect(user.permissions).toEqual(rolePermissions["super admin"]);
    });
});
