const request = require("supertest");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Mock uploadMiddleware to use memory storage
jest.mock("../middleware/uploadMiddleware", () => {
    const multer = require("multer");
    
    // Move 'path' inside the function
    const fileFilter = (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and PDF files are allowed.`), false);
        }
    };

    const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    });

    return {
        uploadKaizenFiles: (req, res, next) => {
            const path = require("path");  // Move 'path' inside here

            upload.fields([
                { name: "beforeKaizenFiles", maxCount: 10 },
                { name: "afterKaizenFiles", maxCount: 10 },
            ])(req, res, (err) => {
                if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ success: false, message: "File upload error", error: "File too large" });
                } else if (err) {
                    return res.status(400).json({ success: false, message: "File upload error", error: err.message });
                }
                if (!req.files || Object.keys(req.files).length === 0) {
                    return res.status(400).json({ success: false, message: "No valid files uploaded." });
                }

                // Add filename simulation inside the middleware
                Object.keys(req.files).forEach(field => {
                    req.files[field].forEach(file => {
                        file.filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
                        file.path = `/uploads/${file.filename}`;
                    });
                });

                next();
            });
        },
    };
});

// Mock fs minimally
jest.mock("fs", () => ({
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
            "1022": { apiUrl: "http://example.com", frGroupName: "J-2 GGM" },
            "9211": { apiUrl: "http://example.com", frGroupName: "ThirdEye AI" },
        })
    ),
}));

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
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
});

describe("UploadController - POST /api/upload/", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should successfully upload beforeKaizenFiles", async () => {
        const response = await request(app)
            .post("/api/upload/")
            .attach("beforeKaizenFiles", Buffer.from("test image"), {
                filename: "test.jpg",
                contentType: "image/jpeg",
            });

        console.log("Test 1 - Upload beforeKaizenFiles:", response.body);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Files uploaded successfully");
        expect(response.body.fileUrls.beforeKaizenFiles).toBeDefined();
        expect(response.body.fileUrls.beforeKaizenFiles[0]).toMatch(/\/uploads\/\d+-\d+\.jpg/);
    });

    it("should successfully upload afterKaizenFiles", async () => {
        const response = await request(app)
            .post("/api/upload/")
            .attach("afterKaizenFiles", Buffer.from("test pdf"), {
                filename: "test.pdf",
                contentType: "application/pdf",
            });

        console.log("Test 2 - Upload afterKaizenFiles:", response.body);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Files uploaded successfully");
        expect(response.body.fileUrls.afterKaizenFiles).toBeDefined();
        expect(response.body.fileUrls.afterKaizenFiles[0]).toMatch(/\/uploads\/\d+-\d+\.pdf/);
    });

    it("should return 400 if no files are uploaded", async () => {
        const response = await request(app).post("/api/upload/");
        console.log("Test 3 - No Files:", response.body);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("No valid files uploaded.");
    });

    it("should return 400 for invalid file type", async () => {
        const response = await request(app)
            .post("/api/upload/")
            .attach("beforeKaizenFiles", Buffer.from("test text"), {
                filename: "test.txt",
                contentType: "text/plain",
            });

        console.log("Test 4 - Invalid File Type:", response.body);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/Invalid file type: text\/plain/);
    });

    it("should return 400 if file exceeds 5MB", async () => {
        const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > 5MB limit
        const response = await request(app)
            .post("/api/upload/")
            .attach("beforeKaizenFiles", largeBuffer, {
                filename: "large.jpg",
                contentType: "image/jpeg",
            });

        console.log("Test 5 - File Too Large:", response.body);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("File upload error");
        expect(response.body.error).toMatch(/File too large/);
    });

    it("should successfully upload multiple files", async () => {
        const response = await request(app)
            .post("/api/upload/")
            .attach("beforeKaizenFiles", Buffer.from("test image 1"), {
                filename: "test1.jpg",
                contentType: "image/jpeg",
            })
            .attach("afterKaizenFiles", Buffer.from("test image 2"), {
                filename: "test2.jpg",
                contentType: "image/jpeg",
            });

        console.log("Test 6 - Multiple Files:", response.body);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Files uploaded successfully");
        expect(response.body.fileUrls.beforeKaizenFiles).toHaveLength(1);
        expect(response.body.fileUrls.afterKaizenFiles).toHaveLength(1);
    });
});
