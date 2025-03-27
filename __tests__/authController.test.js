const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const { User } = require("../models/UserModel");
const { registerUser, loginUser, updateUserRole } = require("../controllers/AuthController");

jest.mock("../models/UserModel"); // Mock Mongoose model
jest.mock("bcryptjs"); // Mock bcrypt
jest.mock("../utils/jwt", () => ({ generateToken: jest.fn() })); // Mock JWT

const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    admin: ["assign_approver", "approve_kaizen", "reject_kaizen"],
    approver: ["approve_kaizen", "reject_kaizen"],
    user: ["submit_kaizen", "view_kaizen_form"],
};

describe("AuthController", () => {
    let req, res, mockUser;

    beforeEach(() => {
        req = { body: {}, params: {}, header: jest.fn() };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

        mockUser = {
            _id: "user123",
            name: "John Doe",
            email: "john@example.com",
            password: "hashedpassword",
            role: "user",
            plantCode: "1022",
            save: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ✅ Register User Test (Fixed Expected Response)
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
        expect(generateToken).toHaveBeenCalledWith(expect.objectContaining({ email: "john@example.com" }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "User registered successfully",
            token: "mockToken",
            user: expect.objectContaining({ email: "john@example.com" }), // ✅ Ensure user object is returned
        });
    });

    // ✅ Login User Test (Fixed Expected Response)
    test("loginUser should authenticate and return a token", async () => {
        req.body = { email: "john@example.com", password: "123456", plantCode: "1022" };

        User.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        generateToken.mockReturnValue("mockToken");

        await loginUser(req, res);

        expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com", plantCode: "1022" });
        expect(bcrypt.compare).toHaveBeenCalledWith("123456", mockUser.password);
        expect(generateToken).toHaveBeenCalledWith(expect.objectContaining({ email: "john@example.com" }));
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Login successful",
            token: "mockToken",
            user: expect.objectContaining({ email: "john@example.com" }), // ✅ Ensure user object is returned
        });
    });

    // ✅ Login Failure (Fixed String Match)
    test("loginUser should fail with incorrect password", async () => {
        req.body = { email: "john@example.com", password: "wrongpassword", plantCode: "1022" };

        User.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false);

        await loginUser(req, res);

        expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com", plantCode: "1022" });
        expect(bcrypt.compare).toHaveBeenCalledWith("wrongpassword", mockUser.password);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid credentials" }); // ✅ Fixed period issue
    });

    // ✅ Update User Role Test
    test("updateUserRole should update user role and permissions", async () => {
        req.body.role = "admin";
        req.params.id = "user123";

        User.findById.mockResolvedValue(mockUser);
        await updateUserRole(req, res);

        expect(User.findById).toHaveBeenCalledWith("user123");
        expect(mockUser.role).toBe("admin");
        expect(mockUser.permissions).toEqual(rolePermissions["admin"]);
        expect(mockUser.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "User role updated successfully",
            user: expect.objectContaining({ role: "admin" }),
        });
    });

    // ✅ Update Role - User Not Found (Fixed String Match)
    test("updateUserRole should return 404 if user is not found", async () => {
        req.body.role = "admin";
        req.params.id = "user456"; // Non-existent user

        User.findById.mockResolvedValue(null);
        await updateUserRole(req, res);

        expect(User.findById).toHaveBeenCalledWith("user456");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "User not found" }); // ✅ Fixed period issue
    });

    // ✅ Prevent Removing Last Super Admin (Ensure countDocuments is called)
    test("updateUserRole should prevent removing the last super admin", async () => {
        req.body.role = "user";
        req.params.id = "superAdmin123";

        const superAdmin = { _id: "superAdmin123", role: "super admin", save: jest.fn() };

        User.findById.mockResolvedValue(superAdmin);
        User.countDocuments.mockResolvedValue(1); // Only one super admin exists

        await updateUserRole(req, res);

        expect(User.findById).toHaveBeenCalledWith("superAdmin123");
        expect(User.countDocuments).toHaveBeenCalledWith({ role: "super admin" }); // ✅ Ensure this is called
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot remove the last super admin." });
    });
});
