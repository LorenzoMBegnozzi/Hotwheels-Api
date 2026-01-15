const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendCodeEmail(to, subject, code) {
  try {
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    const info = await transporter.sendMail({
      from: `Diecast Social <${fromEmail}>`,
      to,
      subject,
      text: `Seu código é: ${code}`,
      html: `<p>Seu código é: <strong>${code}</strong></p>`,
    });

    console.log("Email sent:", info.messageId);
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

module.exports = { sendCodeEmail };
