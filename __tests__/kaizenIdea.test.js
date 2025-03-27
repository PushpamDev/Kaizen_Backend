const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const KaizenIdea = require("../models/KaizenIdea");

let mongoServer;

// Helper function to introduce delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup in-memory MongoDB before running tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clean up after each test with delay
afterEach(async () => {
    await KaizenIdea.deleteMany();
    await delay(100); // Ensuring MongoDB has time to enforce uniqueness constraints
});

// Close MongoDB connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("KaizenIdea Schema", () => {
    test("should create a Kaizen Idea with valid data", async () => {
        const kaizen = new KaizenIdea({
            suggesterName: "John Doe",
            employeeCode: "EMP123",
            plantCode: "PLANT01",
            registrationNumber: "KAIZEN-001",
            category: "Safety",
        });

        const savedKaizen = await kaizen.save();

        expect(savedKaizen._id).toBeDefined();
        expect(savedKaizen.suggesterName).toBe("John Doe");
        expect(savedKaizen.status).toBe("Pending"); // Default value
        expect(savedKaizen.formId).toBeDefined(); // Auto-generated UUID
        expect(savedKaizen.expiresAt).toBeDefined(); // Auto-set expiration
    });

    test("should fail validation if required fields are missing", async () => {
        const kaizen = new KaizenIdea({});
        await expect(kaizen.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should enforce unique registrationNumber", async () => {
        await KaizenIdea.create({
            suggesterName: "Jane Doe",
            employeeCode: "EMP124",
            plantCode: "PLANT02",
            registrationNumber: "KAIZEN-002",
            category: "Cost Reduction",
        });

        await delay(50); // Small delay to allow uniqueness enforcement

        await expect(
            KaizenIdea.create({
                suggesterName: "Another User",
                employeeCode: "EMP125",
                plantCode: "PLANT03",
                registrationNumber: "KAIZEN-002", // Duplicate!
                category: "Efficiency",
            })
        ).rejects.toThrow();
    });

    test("should add a stage to the workflow", async () => {
        const kaizen = new KaizenIdea({
            suggesterName: "Mike Ross",
            employeeCode: "EMP126",
            plantCode: "PLANT04",
            registrationNumber: "KAIZEN-003",
            category: "Productivity",
            stages: [
                { label: "Initial Review", description: "Manager review", status: "active" }
            ],
        });

        const savedKaizen = await kaizen.save();
        expect(savedKaizen.stages.length).toBe(1);
        expect(savedKaizen.stages[0].label).toBe("Initial Review");
    });

    test("should add approval history entries", async () => {
        const kaizen = new KaizenIdea({
            suggesterName: "Harvey Specter",
            employeeCode: "EMP127",
            plantCode: "PLANT05",
            registrationNumber: "KAIZEN-004",
            category: "Quality",
            approvalHistory: [
                { approverEmail: "manager@company.com", decision: "approved", stepId: "S1", role: "Manager" }
            ],
        });

        const savedKaizen = await kaizen.save();
        expect(savedKaizen.approvalHistory.length).toBe(1);
        expect(savedKaizen.approvalHistory[0].decision).toBe("approved");
    });
});
