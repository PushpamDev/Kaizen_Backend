const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const KaizenIdea = require("../models/KaizenIdea");
const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const { startApprovalProcess } = require("../controllers/ApprovalWorkflowController");
const {
    createKaizenIdea,
    getAllKaizenIdeas,
    getKaizenIdeaByRegistrationNumber,
    updateKaizenIdea,
    deleteKaizenIdea,
    getIdeasByStatus,
} = require("../controllers/KaizenController");

jest.mock("../models/KaizenIdea");
jest.mock("../models/ApprovalWorkflow");
jest.mock("../controllers/ApprovalWorkflowController");

const app = express();
app.use(express.json());

// Mock middleware to simulate authenticated user
const mockAuth = (role = "user") => (req, res, next) => {
    req.user = { email: "test@example.com", plantCode: "9211", role };
    next();
};

// Routes
app.post("/api/kaizen", mockAuth(), createKaizenIdea);
app.get("/api/kaizen", mockAuth(), getAllKaizenIdeas);
app.get("/api/kaizen/by-registration", mockAuth(), getKaizenIdeaByRegistrationNumber);
app.put("/api/kaizen/:id", mockAuth(), updateKaizenIdea);
app.delete("/api/kaizen/:id", mockAuth(), deleteKaizenIdea);
app.get("/api/kaizen/by-status", mockAuth(), getIdeasByStatus);

describe("KaizenIdeaController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/kaizen", () => {
        it("should create a new Kaizen idea and start approval process", async () => {
            const mockWorkflow = {
                plantCode: "9211",
                steps: [{ approverEmails: ["approver@example.com"] }],
                version: 1,
            };
            const mockKaizen = {
                registrationNumber: "kaizen123",
                plantCode: "9211",
                suggesterName: "John Doe",
                employeeCode: "EMP123",
                category: "Efficiency",
                currentApprovers: ["approver@example.com"],
                status: "Pending Approval",
                save: jest.fn().mockResolvedValue(true),
            };

            KaizenIdea.findOne.mockResolvedValue(null);
            ApprovalWorkflow.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockWorkflow),
            });
            KaizenIdea.mockImplementation(() => mockKaizen);
            startApprovalProcess.mockResolvedValue();

            const response = await request(app)
                .post("/api/kaizen")
                .send({
                    suggesterName: "John Doe",
                    employeeCode: "EMP123",
                    plantCode: "9211",
                    registrationNumber: "KAIZEN123",
                    category: "Efficiency",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Kaizen idea created successfully and approval workflow started.");
            expect(response.body.kaizen.registrationNumber).toBe("kaizen123");
            expect(startApprovalProcess).toHaveBeenCalledWith("kaizen123", "9211", "John Doe", expect.any(Object));
        });

        it("should return 400 if required fields are missing", async () => {
            const response = await request(app)
                .post("/api/kaizen")
                .send({ suggesterName: "John Doe" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Missing required fields.");
        });

        it("should return 409 if registration number already exists", async () => {
            const mockWorkflow = {
                plantCode: "9211",
                steps: [{ approverEmails: ["approver@example.com"] }],
                version: 1,
            };

            KaizenIdea.findOne.mockResolvedValue({ registrationNumber: "kaizen123" });
            ApprovalWorkflow.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockWorkflow),
            });

            const response = await request(app)
                .post("/api/kaizen")
                .send({
                    suggesterName: "John Doe",
                    employeeCode: "EMP123",
                    plantCode: "9211",
                    registrationNumber: "KAIZEN123",
                    category: "Efficiency",
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Kaizen idea with this registration number already exists.");
        });

        it("should return 400 if no workflow exists for plant", async () => {
            KaizenIdea.findOne.mockResolvedValue(null);
            ApprovalWorkflow.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            });

            const response = await request(app)
                .post("/api/kaizen")
                .send({
                    suggesterName: "John Doe",
                    employeeCode: "EMP123",
                    plantCode: "9211",
                    registrationNumber: "KAIZEN123",
                    category: "Efficiency",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("No approval workflow found for this plant.");
        });
    });

    // Remaining tests unchanged for brevity (they pass already)
    describe("GET /api/kaizen", () => {
        it("should fetch all Kaizen ideas with pagination for regular user", async () => {
            const mockIdeas = [
                { registrationNumber: "kaizen1", plantCode: "9211" },
                { registrationNumber: "kaizen2", plantCode: "9211" },
            ];

            KaizenIdea.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockIdeas),
            });
            KaizenIdea.countDocuments.mockResolvedValue(2);

            const response = await request(app)
                .get("/api/kaizen")
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.ideas).toHaveLength(2);
            expect(response.body.totalPages).toBe(1);
            expect(response.body.totalCount).toBe(2);
            expect(KaizenIdea.find).toHaveBeenCalledWith({ plantCode: "9211" });
        });

        it("should fetch all Kaizen ideas for super admin without plantCode filter", async () => {
            const mockIdeas = [
                { registrationNumber: "kaizen1", plantCode: "9211" },
                { registrationNumber: "kaizen2", plantCode: "1234" },
            ];

            KaizenIdea.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockIdeas),
            });
            KaizenIdea.countDocuments.mockResolvedValue(2);

            app._router.stack.forEach((layer) => {
                if (layer.route && layer.route.path === "/api/kaizen") {
                    layer.route.stack[0].handle = mockAuth("super admin");
                }
            });

            const response = await request(app)
                .get("/api/kaizen")
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.ideas).toHaveLength(2);
            expect(KaizenIdea.find).toHaveBeenCalledWith({});
        });

        it("should return 400 for invalid date format", async () => {
            const response = await request(app)
                .get("/api/kaizen")
                .query({ startDate: "invalid-date" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Invalid date format");
        });
    });

    describe("GET /api/kaizen/by-registration", () => {
        it("should fetch a Kaizen idea by registration number", async () => {
            const mockIdea = { registrationNumber: "kaizen123", plantCode: "9211" };
            KaizenIdea.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockIdea),
            });

            const response = await request(app)
                .get("/api/kaizen/by-registration")
                .query({ registrationNumber: "KAIZEN123" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.idea.registrationNumber).toBe("kaizen123");
            expect(KaizenIdea.findOne).toHaveBeenCalledWith({
                registrationNumber: "kaizen123",
                plantCode: "9211",
            });
        });

        it("should return 400 if registration number is missing", async () => {
            const response = await request(app).get("/api/kaizen/by-registration");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Registration number is required");
        });

        it("should return 404 if Kaizen idea not found", async () => {
            KaizenIdea.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            const response = await request(app)
                .get("/api/kaizen/by-registration")
                .query({ registrationNumber: "KAIZEN123" });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Kaizen idea not found");
        });
    });

    describe("PUT /api/kaizen/:id", () => {
        it("should update a Kaizen idea", async () => {
            const mockUpdatedIdea = { _id: "123", registrationNumber: "kaizen123", suggesterName: "Updated Name" };
            KaizenIdea.findByIdAndUpdate.mockResolvedValue(mockUpdatedIdea);

            const response = await request(app)
                .put("/api/kaizen/123")
                .send({ suggesterName: "Updated Name" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Kaizen idea updated successfully");
            expect(response.body.updatedIdea.suggesterName).toBe("Updated Name");
        });

        it("should return 404 if Kaizen idea not found", async () => {
            KaizenIdea.findByIdAndUpdate.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/kaizen/123")
                .send({ suggesterName: "Updated Name" });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Kaizen idea not found");
        });
    });

    describe("DELETE /api/kaizen/:id", () => {
        it("should delete a Kaizen idea", async () => {
            KaizenIdea.findByIdAndDelete.mockResolvedValue({ _id: "123" });

            const response = await request(app).delete("/api/kaizen/123");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Kaizen idea deleted successfully");
        });

        it("should return 404 if Kaizen idea not found", async () => {
            KaizenIdea.findByIdAndDelete.mockResolvedValue(null);

            const response = await request(app).delete("/api/kaizen/123");

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Kaizen idea not found");
        });
    });

    describe("GET /api/kaizen/by-status", () => {
        it("should fetch Kaizen ideas by status", async () => {
            const mockIdeas = [
                { registrationNumber: "kaizen1", status: "Approved" },
                { registrationNumber: "kaizen2", status: "Approved" },
            ];
            KaizenIdea.find.mockResolvedValue(mockIdeas);

            const response = await request(app)
                .get("/api/kaizen/by-status")
                .query({ status: "Approved" });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].status).toBe("Approved");
        });

        it("should return 400 if status is missing", async () => {
            const response = await request(app).get("/api/kaizen/by-status");

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Status parameter is required.");
        });

        it("should return 400 for invalid status", async () => {
            const response = await request(app)
                .get("/api/kaizen/by-status")
                .query({ status: "Invalid" });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Invalid status provided.");
        });
    });
});