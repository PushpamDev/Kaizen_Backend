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

// 🛑 Mock Dependencies
jest.mock("../models/ApprovalWorkflow");
jest.mock("../models/KaizenIdea");
jest.mock("../services/emailService");

describe("Approval Workflow Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    
        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                { plantCode: "1022", version: 3, steps: [{ stepId: "1", approverEmails: ["approver@example.com"] }] }
            ]) // ✅ Return an array with a valid workflow
        });
    });
    

    test("getWorkflowForPlant should return the latest workflow for a given plant", async () => {
        const mockWorkflow = { plantCode: "1022", version: 3 };

        ApprovalWorkflow.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValueOnce([mockWorkflow]) // ✅ Ensures it's an array
        });

        const result = await getWorkflowForPlant("1022");

        expect(result).toEqual(mockWorkflow);
        expect(ApprovalWorkflow.find).toHaveBeenCalledWith({ plantCode: "1022" }); // ✅ Fixed from findOne to find
    });

    // 🔹 Test startApprovalProcess
    test("startApprovalProcess should assign approvers and send emails", async () => {
        const mockWorkflow = { steps: [{ stepId: "1", approverEmails: ["approver@example.com"] }] };
        ApprovalWorkflow.findOne.mockResolvedValueOnce(mockWorkflow);
        KaizenIdea.updateOne.mockResolvedValueOnce({});

        await startApprovalProcess("KAIZEN123", "1022", { someData: "test" });

        expect(KaizenIdea.updateOne).toHaveBeenCalledWith(
            { registrationNumber: "KAIZEN123" },
            { $set: { currentApprovers: ["approver@example.com"], status: "Pending Approval" } }
        );

        expect(sendApprovalEmail).toHaveBeenCalledWith("approver@example.com", { someData: "test" });
    });

    // 🔹 Test processApproval
    test("processApproval should update approval status", async () => {
        const mockKaizen = {
            registrationNumber: "KAIZEN123",
            plantCode: "1022",
            currentApprovers: ["approver@example.com"],
            approvalHistory: []
        };
        const mockWorkflow = { steps: [{ approverEmails: ["approver@example.com"] }] };

        KaizenIdea.findOne.mockResolvedValueOnce(mockKaizen);
        ApprovalWorkflow.findOne.mockResolvedValueOnce(mockWorkflow);
        KaizenIdea.updateOne.mockResolvedValueOnce({});

        await processApproval("KAIZEN123", "approver@example.com", "approved");

        expect(KaizenIdea.updateOne).toHaveBeenCalled();
    });

    // 🔹 Test createApprovalWorkflow
    test("createApprovalWorkflow should create a new workflow", async () => {
        const validSteps = [{ stepId: "1", approverEmails: ["approver@example.com"] }];
    
        // ✅ Mock `ApprovalWorkflow.findOne` to return `null` with a proper `.lean()` function
        ApprovalWorkflow.findOne = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null), // ✅ Ensures `.lean()` exists
        });
    
        // ✅ Mock `save` function properly
        const mockSaveFunction = jest.fn().mockResolvedValue(true);
    
        // ✅ Ensure `new ApprovalWorkflow()` returns a real Mongoose instance
        ApprovalWorkflow.mockImplementation((data) => {
            return {
                ...data,
                save: mockSaveFunction,  // ✅ Attach `save()` method
            };
        });
    
        // Call the function
        const result = await createApprovalWorkflow("1022", validSteps, "admin");
    
        // Assertions
        expect(result.plantCode).toBe("1022");
        expect(result.steps.length).toBeGreaterThan(0);
        expect(mockSaveFunction).toHaveBeenCalled(); // ✅ Ensure save() was called
    });
    
    
    
    
    
    

    // 🔹 Test deleteApprovalWorkflow
    test("deleteApprovalWorkflow should delete a workflow by ID", async () => {
        ApprovalWorkflow.findById.mockResolvedValueOnce({ _id: "12345" });
        ApprovalWorkflow.findByIdAndDelete.mockResolvedValueOnce({});

        await deleteApprovalWorkflow("12345");

        expect(ApprovalWorkflow.findById).toHaveBeenCalledWith("12345");
        expect(ApprovalWorkflow.findByIdAndDelete).toHaveBeenCalledWith("12345");
    });
});
