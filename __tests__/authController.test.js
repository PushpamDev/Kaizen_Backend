const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const { User } = require("../models/UserModel");
const { registerUser, loginUser, updateUserRole } = require("../controllers/AuthController");

jest.mock("../models/UserModel"); // Mock Mongoose model
jest.mock("bcryptjs"); // Mock bcrypt
jest.mock("../utils/jwt", () => ({ generateToken: jest.fn() })); // Mock JWT

describe("AuthController", () => {
    let req, res, mockUser;

    beforeEach(() => {
        req = { body: {}, params: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        mockUser = { save: jest.fn(), _id: "user123", role: "user", plantCode: "1022" };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Test Register User
    test("registerUser should create a new user and return a token", async () => {
        req.body = { name: "John Doe", email: "john@example.com", password: "123456", role: "user", plantCode: "1022" };

        User.findOne.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue("hashedpassword");
        generateToken.mockReturnValue("mockToken");
        User.mockImplementation(() => mockUser);

        await registerUser(req, res);

        expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com", plantCode: "1022" });
        expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
        expect(mockUser.save).toHaveBeenCalled();
        expect(generateToken).toHaveBeenCalledWith(expect.any(Object));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "User registered successfully", token: "mockToken" });
    });

    // Test Login User
    test("loginUser should authenticate and return a token", async () => {
        req.body = { email: "john@example.com", password: "123456", plantCode: "1022" };

        User.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        generateToken.mockReturnValue("mockToken");

        await loginUser(req, res);

        expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com", plantCode: "1022" });
        expect(bcrypt.compare).toHaveBeenCalledWith("123456", mockUser.password);
        expect(generateToken).toHaveBeenCalledWith(mockUser);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "Login successful", token: "mockToken" });
    });

    // Test Update User Role
    test("updateUserRole should update user role and permissions", async () => {
        req.body.role = "admin";
        req.params.id = "user123";

        User.findById.mockResolvedValue(mockUser);
        await updateUserRole(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(mockUser.role).toBe("admin");
        expect(mockUser.permissions).toEqual(["assign_approver", "approve_kaizen", "reject_kaizen"]);
        expect(mockUser.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "User role updated successfully", user: mockUser });
    });
});
