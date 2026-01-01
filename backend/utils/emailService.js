const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendCodeEmail(to, subject, code) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const mailOptions = {
    from: `Diecast Social <${fromAddress}>`,
    to,
    subject,
    text: `Seu código é: ${code}`,
    html: `<p>Seu código é: <strong>${code}</strong></p>`,
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendCodeEmail };
