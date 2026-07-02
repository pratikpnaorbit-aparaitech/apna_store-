const router = require("express").Router();
const { sendSMS } = require("../utils/notificationService");

router.get("/test-sms", async (req, res) => {
  try {
    await sendSMS("+917410781884", "✅ SmartStore SMS Test Success");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
