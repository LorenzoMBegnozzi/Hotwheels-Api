console.log("🔥🔥🔥 EMAILSERVICE LOADED (RESEND) 🔥🔥🔥");

const { Resend } = require("resend");

console.log("RESEND_API_KEY exists?", !!process.env.RESEND_API_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCodeEmail(to, subject, code) {
  console.log("➡️ sendCodeEmail called:", { to, subject });

  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      text: `Seu código é: ${code}`,
      html: `<p>Seu código é: <strong>${code}</strong></p>`,
    });

    console.log("✅ RESEND RESULT:", result);
    return result;
  } catch (err) {
    console.error("❌ RESEND ERROR status:", err?.statusCode);
    console.error("❌ RESEND ERROR message:", err?.message);
    console.error(err);
    throw err;
  }
}

module.exports = { sendCodeEmail };
