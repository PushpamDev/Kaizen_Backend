const request = require("supertest");
const axios = require("axios");
const mongoose = require("mongoose");

// Mock axios
jest.mock("axios");

// Import the app setup function from index.js
let app;
let server;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI = "mongodb+srv://Ivan:David%4030%2F08%2F2003@cluster1.pdoo2.mongodb.net/Kaizen_DB?retryWrites=true&w=majority&appName=Cluster1";
    process.env.PORT = 0;

    // Mock mongoose connection
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

describe("EmployeeController - GET /api/employees/search-employee", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should successfully search employees by name", async () => {
        // Mock axios response
        axios.get.mockResolvedValue({
            data: {
                employeeInfo: [
                    { empId: "Udit_62334", designation: "Engineer", department: "Production" },
                    { empId: "Nishant_67520", designation: "Manager", department: "Operations" },
                ],
            },
        });

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "Udit", plantCode: "1022" });

        console.log("Test 1 - Search by Name:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employees).toHaveLength(1);
        expect(response.body.employees[0]).toEqual({
            name: "udit",
            employeeCode: "62334",
            designation: "Engineer",
            department: "Production",
        });
    });

    it("should successfully search employees by code", async () => {
        axios.get.mockResolvedValue({
            data: {
                employeeInfo: [
                    { empId: "Udit_62334", designation: "Engineer", department: "Production" },
                    { empId: "Nishant_67520", designation: "Manager", department: "Operations" },
                ],
            },
        });

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "67520", plantCode: "1022" });

        console.log("Test 2 - Search by Code:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employees).toHaveLength(1);
        expect(response.body.employees[0]).toEqual({
            name: "nishant",
            employeeCode: "67520",
            designation: "Manager",
            department: "Operations",
        });
    });

    it("should return 400 if query is missing", async () => {
        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ plantCode: "1022" });

        console.log("Test 3 - Missing Query:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Employee name or code is required for search.");
    });

    it("should return 404 if no employees match the query", async () => {
        axios.get.mockResolvedValue({
            data: {
                employeeInfo: [
                    { empId: "Udit_62334", designation: "Engineer", department: "Production" },
                ],
            },
        });

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "Nishant", plantCode: "1022" });

        console.log("Test 4 - No Match:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("No employee found with the given details.");
    });

    it("should use default plantCode 9211 if plantCode is invalid", async () => {
        axios.get.mockResolvedValue({
            data: {
                employeeInfo: [
                    { empId: "Udit_62334", designation: "Engineer", department: "Production" },
                ],
            },
        });

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "Udit", plantCode: "9999" });

        console.log("Test 5 - Invalid PlantCode:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employees).toHaveLength(1);
        expect(axios.get).toHaveBeenCalledWith(
            "http://fr.thirdeye-ai.com/face/getEmpInfo?onlyId=1&frGroupName=ThirdEye%20AI&companyId=JBMGroup&frGroup=frAttendance"
        );
    });

    it("should return 500 if API response format is invalid", async () => {
        axios.get.mockResolvedValue({
            data: { invalid: "data" }, // Missing employeeInfo array
        });

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "Udit", plantCode: "1022" });

        console.log("Test 6 - Invalid API Response:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid API response format");
    });

    it("should return 500 if axios request fails", async () => {
        axios.get.mockRejectedValue(new Error("Network error"));

        const response = await request(app)
            .get("/api/employees/search-employee")
            .query({ query: "Udit", plantCode: "1022" });

        console.log("Test 7 - Axios Failure:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        console.log("Body:", response.text);

        expect(response.headers["content-type"]).toMatch(/json/);
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Server error");
        expect(response.body.error).toBe("Network error");
    });
});