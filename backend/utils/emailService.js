const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

function buildVerificationEmail(code) {
  return `
  <div style="max-width:480px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px">
    <h2 style="margin-top:0;color:#111827;text-align:center">
      Diecast Social
    </h2>

    <p style="color:#374151;font-size:14px">
      Você solicitou um código de verificação para continuar no <strong>Diecast Social</strong>.
    </p>

    <div style="background:#f3f4f6;border-radius:6px;padding:16px;text-align:center;margin:24px 0">
      <p style="margin:0;font-size:13px;color:#6b7280">Seu código</p>
      <p style="margin:8px 0 0;font-size:28px;letter-spacing:4px;font-weight:bold;color:#111827">
        ${code}
      </p>
    </div>

    <p style="color:#374151;font-size:13px">
      Este código é válido por <strong>15 minutos</strong>.
      Se você não solicitou, pode ignorar este email.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />

    <p style="font-size:12px;color:#9ca3af;text-align:center">
      © Diecast Social
    </p>
  </div>
  `;
}

async function sendCodeEmail(to, subject, code) {
  try {
    return await resend.emails.send({
      from: "Diecast Social <onboarding@resend.dev>",
      to,
      subject,
      html: buildVerificationEmail(code),
    });
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}

module.exports = { sendCodeEmail };
