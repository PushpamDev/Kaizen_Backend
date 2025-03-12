const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("📨 Email Service Initialized");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const generateKaizenPDF = (kaizenData) => {
    return new Promise((resolve, reject) => {
        const pdfPath = path.join(__dirname, `Kaizen_${kaizenData.registrationNumber}.pdf`);
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.fontSize(18).text("KAIZEN IDEA SHEET", { align: "center", underline: true }).moveDown(1);
        
        // Section 1: Basic Details
        doc.fontSize(12).text(`KAIZEN THEME: ${kaizenData.theme}`);
        doc.text(`Kaizen Category: ${kaizenData.category}`);
        doc.text(`Unit: ${kaizenData.unit}`);
        doc.text(`Plant: ${kaizenData.plant}`).moveDown(1);
        
        // Suggestor and Implementer Details
        doc.text("Suggestor Details:", { underline: true });
        doc.text(`Name: ${kaizenData.suggesterName}`);
        doc.text(`Employee Code: ${kaizenData.employeeCode}`).moveDown(0.5);
        
        doc.text("Implementer Details:", { underline: true });
        doc.text(`Name: ${kaizenData.implementerName}`);
        doc.text(`Employee Code: ${kaizenData.implementerCode}`);
        doc.text(`Implementation Date: ${kaizenData.implementationDate}`).moveDown(1);
        
        // Problem Statement & Solution
        doc.text("Problem Statement:", { underline: true });
        doc.text(kaizenData.problemStatement).moveDown(0.5);
        
        doc.text("Implemented Solution:", { underline: true });
        doc.text(kaizenData.description).moveDown(1);
        
        // Before & After Kaizen Images
        if (kaizenData.beforeKaizenFiles?.length) {
            doc.text("Before Kaizen:", { underline: true });
            doc.image(kaizenData.beforeKaizenFiles[0], { fit: [250, 150], align: "center" }).moveDown(1);
        }
        if (kaizenData.afterKaizenFiles?.length) {
            doc.text("After Kaizen:", { underline: true });
            doc.image(kaizenData.afterKaizenFiles[0], { fit: [250, 150], align: "center" }).moveDown(1);
        }
        
        // Financial & Operational Benefits
        const financialBenefit = kaizenData.benefits?.financial || "Not specified";
        const operationalBenefit = kaizenData.benefits?.operational || kaizenData.benefits || "Not specified";
        
        doc.text("Benefits:", { underline: true });
        doc.text(`Financial Benefits (Rs./Year): ${financialBenefit}`);
        doc.text(`Operational Benefits: ${operationalBenefit}`).moveDown(1);
        
        // Cost of Implementation & Remarks
        doc.text(`Cost of Implementation (COI): Rs. ${kaizenData.implementationCost}`);
        doc.text(`Results Verification Remark: ${kaizenData.standardization}`).moveDown(1);
        
        // Benefit-Cost Ratio & Horizontal Deployment
        doc.text(`Benefit-Cost Ratio: ${kaizenData.benefitCostRatio || "N/A"}`);
        doc.text(`Horizontal Deployment: ${kaizenData.horizontalDeployment}`).moveDown(1);
        
        // End Document
        doc.end();
        
        stream.on("finish", () => resolve(pdfPath));
        stream.on("error", (err) => reject(err));
    });
};

const sendApprovalEmail = async (approverEmail, kaizenData) => {
    try {
        console.log(`📨 Sending approval email to: ${approverEmail}`);
        const pdfPath = await generateKaizenPDF(kaizenData);
        
        const approveUrl = `http://your-api.com/api/approval-workflow/approve/${kaizenData.registrationNumber}?approverEmail=${approverEmail}&decision=approved`;
        const rejectUrl = `http://your-api.com/api/approval-workflow/approve/${kaizenData.registrationNumber}?approverEmail=${approverEmail}&decision=rejected`;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: approverEmail,
            subject: `Approval Required: Kaizen Idea ${kaizenData.registrationNumber} 🚀`,
            html: `
                <p>Dear Approver,</p>
                <p>A new Kaizen idea requires your approval.</p>
                <ul>
                    <li><strong>Idea ID:</strong> ${kaizenData.registrationNumber}</li>
                    <li><strong>Submitted By:</strong> ${kaizenData.suggesterName}</li>
                    <li><strong>Description:</strong> ${kaizenData.description}</li>
                </ul>
                <p>Please review the idea and take necessary action:</p>
                <a href="${approveUrl}" style="padding: 10px; background-color: green; color: white; text-decoration: none; border-radius: 5px;">✅ Approve</a>
                <a href="${rejectUrl}" style="padding: 10px; background-color: red; color: white; text-decoration: none; border-radius: 5px;">❌ Reject</a>
                <p>Best Regards,</p>
                <p><strong>Kaizen Team</strong></p>
            `,
            attachments: [{
                filename: `Kaizen_${kaizenData.registrationNumber}.pdf`,
                path: pdfPath,
            }],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${approverEmail}: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error sending approval email:", error);
    }
};

module.exports = { sendApprovalEmail };
