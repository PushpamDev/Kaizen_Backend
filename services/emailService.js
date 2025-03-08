const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("📨 Email Service Initialized"); // ✅ Check if the service is loaded

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // ✅ Important for Mailgun on port 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a confirmation email upon Kaizen idea submission.
 * @param {string} email - Recipient email
 * @param {Object} kaizenData - Kaizen Idea data
 */
const sendKaizenSubmissionEmail = async (email, kaizenData) => {
    try {
        console.log("📨 Preparing to send email to:", email); // ✅ Debug Log

        // ✅ Email Content
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Kaizen Idea Submitted Successfully",
            text: `Dear ${kaizenData.suggesterName},\n\nYour Kaizen idea has been successfully submitted!\n\nThank you for your contribution.\n\nBest regards,\nKaizen Team`,
        };

        // ✅ Send Email
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email sent successfully:", info.response);

    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

module.exports = sendKaizenSubmissionEmail;
