const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const pdfkit = require("pdfkit"); // 📌 Ensure you install: npm install pdfkit
require("dotenv").config();

console.log("📨 Email Service Initialized"); // ✅ Debugging

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Generates a PDF summary of the Kaizen Idea
 * @param {Object} kaizenData - Kaizen Idea details
 * @returns {string} PDF file path
 */
const generateKaizenPDF = (kaizenData) => {
    return new Promise((resolve, reject) => {
        const pdfPath = path.join(__dirname, `Kaizen_${kaizenData.registrationNumber}.pdf`);
        const doc = new pdfkit();

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // 📌 PDF Content
        doc.fontSize(18).text("Kaizen Idea Submission", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Registration Number: ${kaizenData.registrationNumber}`);
        doc.text(`Suggester: ${kaizenData.suggesterName} (${kaizenData.employeeCode})`);
        doc.text(`Category: ${kaizenData.category}`);
        doc.text(`Description: ${kaizenData.description}`);
        doc.text(`Problem Statement: ${kaizenData.problemStatement}`);
        doc.text(`Before Kaizen: ${kaizenData.beforeKaizen}`);
        doc.text(`After Kaizen: ${kaizenData.afterKaizen}`);
        doc.text(`Benefits: ${kaizenData.benefits}`);
        doc.text(`Implementation Cost: ${kaizenData.implementationCost}`);
        doc.text(`Benefit-Cost Ratio: ${kaizenData.benefitCostRatio}`);
        doc.text(`Standardization: ${kaizenData.standardization}`);
        doc.text(`Horizontal Deployment: ${kaizenData.horizontalDeployment}`);
        
        doc.end();

        stream.on("finish", () => resolve(pdfPath));
        stream.on("error", reject);
    });
};

/**
 * Sends a confirmation email with a PDF attachment upon Kaizen idea submission.
 * @param {string} email - Recipient email
 * @param {Object} kaizenData - Kaizen Idea details
 */
const sendApprovalEmail = async (approverEmail, kaizenData) => {
    try {
        console.log(`📨 Sending approval email to: ${approverEmail}`);

        // Define API URLs for approval and rejection
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
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    <tr>
                        <td align="center" style="border-radius: 5px;" bgcolor="#28a745">
                            <a href="${approveUrl}" target="_blank" style="display: inline-block; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; background-color: #28a745; padding: 12px 24px; border-radius: 5px; border: 1px solid #28a745; font-weight: bold;">
                                ✅ Approve
                            </a>
                        </td>
                        <td width="20"></td>
                        <td align="center" style="border-radius: 5px;" bgcolor="#dc3545">
                            <a href="${rejectUrl}" target="_blank" style="display: inline-block; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; background-color: #dc3545; padding: 12px 24px; border-radius: 5px; border: 1px solid #dc3545; font-weight: bold;">
                                ❌ Reject
                            </a>
                        </td>
                    </tr>
                </table>

                <p>Best Regards,</p>
                <p><strong>Kaizen Team</strong></p>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${approverEmail}: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error sending approval email:", error);
    }
};







module.exports = {  sendApprovalEmail };
