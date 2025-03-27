const request = require("supertest");
const mongoose = require("mongoose");
const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow");

// Mock the ApprovalWorkflowController
jest.mock("../controllers/ApprovalWorkflowController", () => ({
    startApprovalProcess: jest.fn().mockResolvedValue(true),
}));

// Mock Mongoose models
jest.mock("../models/KaizenIdea");
jest.mock("../models/ApprovalWorkflow");

let app;
let server;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI = "mongodb+srv://Ivan:David%4030%2F08%2F2003@cluster1.pdoo2.mongodb.net/Kaizen_DB?retryWrites=true&w=majority&appName=Cluster1";
    process.env.PORT = 0;

    jest.spyOn(mongoose, "connect").mockImplementation(() => Promise.resolve());

    const setupApp = require("../index");
    app = await setupApp();

    return new Promise((resolve) => {
        server = app.listen(0, () => {
            console.log("Test server running on port:", server.address().port);
            resolve();
        });
    });
});

afterAll(async () => {
    jest.restoreAllMocks();
    if (server) server.close();
    await mongoose.connection.close();
});

describe("KaizenController - POST /api/kaizen/create", () => {
    let mockRequestData;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequestData = {
            suggesterName: "Udit Mishra",
            employeeCode: "62334",
            plantCode: "1022",
            implementerName: "Nishant Pandey",
            implementerCode: "67520",
            implementationDate: "2025-03-09",
            registrationNumber: "20976355",
            category: "Energy Efficiency",
            problemStatement: "High energy consumption in production line.",
            description: "Implementing automatic shutdown for idle machinery.",
            beforeKaizen: "Machines left running during non-production hours.",
            afterKaizen: "Automated shutdown system saves energy.",
            tangibleBenefits: "Expected energy savings of 15% per month.",
            implementationCost: 2000,
            benefitCostRatio: 5,
            standardization: "Will be documented in SOPs.",
            horizontalDeployment: "Planned for other units.",
            beforeKaizenFiles: ["http://localhost:5000/uploads/before.jpg"],
            afterKaizenFiles: ["http://localhost:5000/uploads/after.png"],
        };
    });

    it("should successfully create a Kaizen idea and start the approval process", async () => {
        ApprovalWorkflow.findOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue({
                steps: [{ approverEmails: ["approver@example.com"] }],
                version: 1,
            }),
        });

        KaizenIdea.findOne.mockResolvedValue(null);
        const savedKaizen = {
            ...mockRequestData,
            registrationNumber: "20976355",
            isApproved: false,
            status: "Pending Approval",
            currentStage: 0,
            currentApprovers: ["approver@example.com"],
            workflowVersion: 1,
        };
        KaizenIdea.mockImplementation(() => ({
            ...savedKaizen, // Spread the full object to mimic Mongoose document
            save: jest.fn().mockResolvedValue(savedKaizen),
        }));

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(mockRequestData);

        console.log("Test 1 - Create Kaizen Idea:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Kaizen idea created successfully and approval workflow started.");
        expect(response.body.kaizen.suggesterName).toBe("Udit Mishra");
        expect(response.body.kaizen.registrationNumber).toBe("20976355");

        const { startApprovalProcess } = require("../controllers/ApprovalWorkflowController");
        expect(startApprovalProcess).toHaveBeenCalledWith(
            "20976355",
            "1022",
            "Udit Mishra",
            expect.objectContaining({ suggesterName: "Udit Mishra" })
        );
    });

    it("should return 400 if required fields are missing", async () => {
        const invalidData = { ...mockRequestData };
        delete invalidData.suggesterName;

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(invalidData);

        console.log("Test 2 - Missing Fields:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Missing required fields.");
    });

    it("should return 409 if Kaizen idea already exists", async () => {
        KaizenIdea.findOne.mockResolvedValue({ registrationNumber: "20976355" });

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(mockRequestData);

        console.log("Test 3 - Duplicate Idea:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Kaizen idea with this registration number already exists.");
    });

    it("should return 400 if no approval workflow is found for the plant", async () => {
        KaizenIdea.findOne.mockResolvedValue(null);
        ApprovalWorkflow.findOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue(null),
        });

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(mockRequestData);

        console.log("Test 4 - No Workflow:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("No approval workflow found for this plant.");
    });

    it("should return 400 if no approvers are found for the first step", async () => {
        KaizenIdea.findOne.mockResolvedValue(null);
        ApprovalWorkflow.findOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue({
                steps: [{}],
                version: 1,
            }),
        });

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(mockRequestData);

        console.log("Test 5 - No Approvers:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("No approvers assigned for the first step.");
    });

    it("should return 500 if there is a server error", async () => {
        KaizenIdea.findOne.mockRejectedValue(new Error("Database error"));

        const response = await request(app)
            .post("/api/kaizen/create")
            .send(mockRequestData);

        console.log("Test 6 - Server Error:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Server error");
    });
});