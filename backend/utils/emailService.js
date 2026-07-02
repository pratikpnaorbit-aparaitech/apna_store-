const nodemailer = require("nodemailer");

function getTransporter() {
  const host = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST;
  const port = process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT;
  const user = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

  if (!host || !port || !user || !pass) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

async function sendOtpEmail({ email, otp, purpose }) {
  const isRegistration = purpose === "registration";
  const action = isRegistration ? "complete your registration" : "reset your password";
  const subject = isRegistration
    ? "SmartStore registration OTP"
    : "SmartStore password reset OTP";

  const text = `Your SmartStore OTP is ${otp}. It is valid for 10 minutes. Do not share it with anyone.`;
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px">
        <h2 style="color:#15803d">SmartStore</h2>
        <p>Use this one-time password to ${action}:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f0fdf4;color:#166534;padding:16px;text-align:center;border-radius:12px">${otp}</div>
        <p style="color:#6b7280;font-size:13px">This OTP expires in 10 minutes. Never share it with anyone.</p>
      </div>`;

  // A Brevo REST API key (xkeysib-...) is different from an SMTP key.
  // Prefer the REST API when it is configured; SMTP remains available as fallback.
  if (process.env.BREVO_API_KEY) {
    const senderEmail = process.env.MAIL_FROM_EMAIL;
    if (!senderEmail) throw new Error("MAIL_FROM_EMAIL is not configured");

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: process.env.MAIL_FROM_NAME || "SmartStore",
        },
        to: [{ email }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brevo email failed (${response.status}): ${details}`);
    }
    return;
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = { sendOtpEmail };
