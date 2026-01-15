const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCodeEmail(to, subject, code) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: `Seu código é: ${code}`,
      html: `<p>Seu código é: <strong>${code}</strong></p>`,
    });

    console.log("Email sent:", result?.data?.id || result);
    return result;
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

module.exports = { sendCodeEmail };
