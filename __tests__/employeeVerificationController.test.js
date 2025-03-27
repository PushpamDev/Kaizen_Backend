const request = require("supertest");
const express = require("express");
const axios = require("axios"); // Import axios
const verifyEmployee = require("../controllers/EmployeeVerificationController");

const app = express();

// Mock route to use the verifyEmployee controller
app.get("/api/status/verify-employee", verifyEmployee);

// Mock the axios module
jest.mock("axios");

describe("Employee Verification Controller - verifyEmployee", () => {
  
  it("should return 400 if plantCode or empId is missing", async () => {
    const res = await request(app)
      .get("/api/status/verify-employee")
      .query({});
    
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing parameters: plantCode and empId are required.");
  });

  it("should return 400 if invalid plantCode is provided", async () => {
    const res = await request(app)
      .get("/api/status/verify-employee")
      .query({ plantCode: "invalidCode", empId: "58690" });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid plant code: invalidCode");
  });

  it("should return employee status 'Present' if employee is found", async () => {
    // Mock API response using axios
    axios.get.mockResolvedValue({
      data: [{ time: "09:00 AM" }] // Simulating a 'Present' record with time
    });

    const res = await request(app)
      .get("/api/status/verify-employee")
      .query({ plantCode: "1022", empId: "58690" }); // Use present employee code

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Present");
    expect(res.body.empId).toBe("58690");
    expect(res.body.plantCode).toBe("1022");
  });

  it("should return employee status 'Absent' if employee is not found", async () => {
    // Mock API response using axios
    axios.get.mockResolvedValue({
      data: [] // Simulating an 'Absent' response (no 'time' field)
    });

    const res = await request(app)
      .get("/api/status/verify-employee")
      .query({ plantCode: "1022", empId: "39224" }); // Use absent employee code

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Absent");
  });

  it("should handle API failure and return 500", async () => {
    // Mock API failure using axios
    axios.get.mockRejectedValue(new Error("API failure"));

    const res = await request(app)
      .get("/api/status/verify-employee")
      .query({ plantCode: "1022", empId: "58690" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
