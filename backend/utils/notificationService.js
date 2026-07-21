const twilio = require("twilio");

const notificationsDisabled = () => String(process.env.DISABLE_OUTBOUND_NOTIFICATIONS || "").toLowerCase() === "true";
const getClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
    throw new Error("Twilio notifications are not configured");
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

exports.sendSMS = async (to, message) => {
  if (notificationsDisabled()) return { disabled: true };
  if (!process.env.TWILIO_PHONE) throw new Error("TWILIO_PHONE is not configured");
  return getClient().messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to
  });
};

exports.sendWhatsApp = async (to, message) => {
  if (notificationsDisabled()) return { disabled: true };
  if (!process.env.TWILIO_WA_NUMBER) throw new Error("TWILIO_WA_NUMBER is not configured");
  return getClient().messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WA_NUMBER}`,
    to: "whatsapp:" + to
  });
};
