const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateKaizenPDF = async (req, res, next) => {
    try {
        const { suggesterName, employeeCode, category, plantCode, registrationNumber } = req.body;

        if (!suggesterName || !employeeCode || !category || !plantCode || !registrationNumber) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        // Create a unique filename for the PDF
        const pdfFileName = `Kaizen_${registrationNumber}.pdf`;
        const pdfPath = path.join(__dirname, "../public/pdfs/", pdfFileName);

        // Create a PDF document
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Add content to the PDF
        doc.fontSize(16).text("Kaizen Idea Form", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Suggester Name: ${suggesterName}`);
        doc.text(`Employee Code: ${employeeCode}`);
        doc.text(`Category: ${category}`);
        doc.text(`Plant Code: ${plantCode}`);
        doc.text(`Registration Number: ${registrationNumber}`);

        doc.end();

        // Wait until the PDF is fully saved
        stream.on("finish", () => {
            // Attach the generated PDF path to req.body
            req.body.pdfPath = `/public/pdfs/${pdfFileName}`;
            next(); // Move to the next middleware (creating the Kaizen idea)
        });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ success: false, message: "Error generating PDF", error: error.message });
    }
};

module.exports = generateKaizenPDF;
