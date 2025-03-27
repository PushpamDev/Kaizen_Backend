const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const ApprovalWorkflow = require("../models/ApprovalWorkflow"); // Update path

let mongoServer;

// Setup in-memory MongoDB before running tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
    await ApprovalWorkflow.deleteMany();
});

// Close MongoDB connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("ApprovalWorkflow Schema", () => {
    test("should create an approval workflow with valid data", async () => {
        const workflow = new ApprovalWorkflow({
            plantCode: "PLANT123",
            steps: [
                {
                    stepId: "STEP1",
                    role: "Manager",
                    approverEmails: ["manager@example.com"],
                    decisionPoints: [{ email: "manager@example.com", decision: "approve" }]
                }
            ],
            version: 1,
            history: [
                { version: 1, changes: "Initial creation", updatedAt: new Date() }
            ]
        });

        const savedWorkflow = await workflow.save();

        expect(savedWorkflow._id).toBeDefined();
        expect(savedWorkflow.plantCode).toBe("PLANT123");
        expect(savedWorkflow.steps.length).toBe(1);
        expect(savedWorkflow.steps[0].role).toBe("Manager");
        expect(savedWorkflow.steps[0].approverEmails).toContain("manager@example.com");
    });

    test("should fail validation when required fields are missing", async () => {
        const invalidWorkflow = new ApprovalWorkflow({}); // Missing required fields

        await expect(invalidWorkflow.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test("should enforce unique plantCode", async () => {
        await ApprovalWorkflow.create({ plantCode: "PLANT123", steps: [] });
        
        await expect(
            ApprovalWorkflow.create({ plantCode: "PLANT123", steps: [] }) // Duplicate plantCode
        ).rejects.toThrow();
    });

    test("should allow multiple decision points per step", async () => {
        const workflow = new ApprovalWorkflow({
            plantCode: "PLANT456",
            steps: [
                {
                    stepId: "STEP2",
                    role: "Supervisor",
                    approverEmails: ["supervisor@example.com"],
                    decisionPoints: [
                        { email: "supervisor@example.com", decision: "approve" },
                        { email: "manager@example.com", decision: "reject" }
                    ]
                }
            ]
        });

        const savedWorkflow = await workflow.save();

        expect(savedWorkflow.steps[0].decisionPoints.length).toBe(2);
    });
});
