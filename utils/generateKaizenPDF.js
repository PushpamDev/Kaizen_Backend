const fs = require("fs");
const path = require("path");
const pathModule = require("path"); // Avoid "Identifier 'path' has already been declared" issue
const puppeteer = require("puppeteer");
const ejs = require("ejs"); // Import EJS for template processing

// Ensure directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Function to generate PDF
const generateKaizenPDF = async (data) => {
    try {
        console.log("🛠 Debugging Data for PDF:", data); // ✅ Log the data

        if (!data.registrationNo) {
            throw new Error("❌ registrationNo is missing from the data object");
        }

        const ejs = require('ejs');
        const fs = require('fs');
        const path = require('path');
        const pdf = require('html-pdf');

        // Read EJS template
        const templatePath = path.join(__dirname, "../templates/kaizenTemplate.ejs");
        const template = fs.readFileSync(templatePath, "utf8");

        // Render EJS with Data
        const html = ejs.render(template, data);

        // Generate PDF
        pdf.create(html).toFile("KaizenIdeaSheet.pdf", (err, res) => {
            if (err) {
                console.error("❌ Error generating PDF:", err);
                return;
            }
            console.log("✅ PDF Generated:", res.filename);
        });
    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
    }
};


module.exports = generateKaizenPDF;
