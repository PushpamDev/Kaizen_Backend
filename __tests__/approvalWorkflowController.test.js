const mongoose = require("mongoose");
const {
    getWorkflowForPlant,
    startApprovalProcess,
    processApproval,
    createApprovalWorkflow,
    deleteApprovalWorkflow
} = require("../controllers/ApprovalWorkflowController");

const ApprovalWorkflow = require("../models/ApprovalWorkflow");
const KaizenIdea = require("../models/KaizenIdea");
const { sendApprovalEmail } = require("../services/emailService");

// Mock Dependencies
jest.mock("../models/ApprovalWorkflow");
jest.mock("../models/KaizenIdea");
jest.mock("../services/emailService");

describe("Approval Workflow Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress logs
        jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress errors
    });

    test("getWorkflowForPlant should return the latest workflow for a given plant", async () => {
        const mockWorkflow = { plantCode: "1022", version: 3 };

        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValueOnce([mockWorkflow]), // Returning an array
        });
        

        const result = await getWorkflowForPlant("1022");

        expect(result).toEqual(mockWorkflow);
        expect(ApprovalWorkflow.find).toHaveBeenCalledWith({ plantCode: "1022" });
    });

    test("startApprovalProcess should assign approvers and send emails", async () => {
        const mockWorkflow = {
            steps: [{ stepId: "1", approverEmails: ["approver@example.com"] }]
        };

        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValueOnce([mockWorkflow]), // Returning an array
        });
        
        KaizenIdea.updateOne.mockResolvedValueOnce({});
        sendApprovalEmail.mockResolvedValueOnce(true);

        await startApprovalProcess("KAIZEN123", "1022", { someData: "test" });

        expect(KaizenIdea.updateOne).toHaveBeenCalledWith(
            { registrationNumber: "KAIZEN123" },
            { $set: { currentApprovers: ["approver@example.com"], status: "Pending Approval" } }
        );

        expect(sendApprovalEmail).toHaveBeenCalledWith("approver@example.com", { someData: "test" });
    });

    test("processApproval should update approval status and handle recursive steps", async () => {
        const mockKaizen = {
            registrationNumber: "KAIZEN123",
            plantCode: "1022",
            currentApprovers: ["approver@example.com"],
            approvalHistory: []
        };
        const mockWorkflow = {
            steps: [
                {
                    approverEmails: ["approver@example.com"],
                    children: [{ approverEmails: ["nextApprover@example.com"] }]
                }
            ]
        };

        KaizenIdea.findOne.mockResolvedValueOnce(mockKaizen);
        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValueOnce([mockWorkflow]), // Returning an array
        });
        
        KaizenIdea.updateOne.mockResolvedValueOnce({});
        sendApprovalEmail.mockResolvedValueOnce(true);

        await processApproval("KAIZEN123", "approver@example.com", "approved");

        expect(KaizenIdea.updateOne).toHaveBeenCalled();
        expect(sendApprovalEmail).toHaveBeenCalledWith("nextApprover@example.com", expect.any(Object));
    });

    test("processApproval should reject a Kaizen idea", async () => {
        const mockKaizen = {
            registrationNumber: "KAIZEN123",
            plantCode: "1022",
            currentApprovers: ["approver@example.com"],
            approvalHistory: []
        };
        const mockWorkflow = {
            steps: [{ approverEmails: ["approver@example.com"] }]
        };

        KaizenIdea.findOne.mockResolvedValueOnce(mockKaizen);
        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValueOnce([mockWorkflow]), // Returning an array
        });
        
        KaizenIdea.updateOne.mockResolvedValueOnce({});

        await processApproval("KAIZEN123", "approver@example.com", "rejected");

        expect(KaizenIdea.updateOne).toHaveBeenCalledWith(
            { registrationNumber: "KAIZEN123" },
            { $set: { status: "Rejected", isApproved: false, currentApprovers: [] } }
        );
    });

    test("createApprovalWorkflow should create or update a workflow", async () => {
        const validSteps = [{ stepId: "1", approverEmails: ["approver@example.com"] }];
        const mockRequest = {
            user: { email: "admin@example.com", plantCode: "1022" },
            body: { steps: validSteps }
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        const mockWorkflow = {
            plantCode: "1022",
            version: 1,
            steps: validSteps,
            history: [],
            save: jest.fn().mockResolvedValue(true)
        };

        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValueOnce([mockWorkflow]), // Returning an array
        });
        

        await createApprovalWorkflow(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Approval workflow created/updated successfully."
            })
        );
    });

    test("deleteApprovalWorkflow should delete a workflow by ID", async () => {
        ApprovalWorkflow.findById.mockResolvedValueOnce({ _id: "12345" });
        ApprovalWorkflow.findByIdAndDelete.mockResolvedValueOnce({});

        await deleteApprovalWorkflow("12345");

        expect(ApprovalWorkflow.findById).toHaveBeenCalledWith("12345");
        expect(ApprovalWorkflow.findByIdAndDelete).toHaveBeenCalledWith("12345");
    });
});
