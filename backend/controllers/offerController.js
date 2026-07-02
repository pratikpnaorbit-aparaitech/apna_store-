const Customer = require("../models/Customer");
const { sendWhatsApp } = require("../utils/notificationService");

exports.sendOfferToLoyalCustomers = async (req, res) => {
  const { message } = req.body;

  try {
    // Find customers with total_spent >= 5000 and valid phone numbers
    const customers = await Customer.find({ 
      total_spent: { $gte: 5000 },
      phone: { $exists: true, $ne: null }
    });

    // Send WhatsApp messages
    for (const c of customers) {
      try {
        await sendWhatsApp(
          `+91${c.phone}`,
          `🔥 SmartStore Offer 🔥\n${message}`
        );
      } catch (whatsappErr) {
        console.error(`WhatsApp failed for ${c.phone}:`, whatsappErr.message);
      }
    }

    res.json({
      success: true,
      sentTo: customers.length
    });

  } catch (err) {
    console.error("Offer broadcast error:", err);
    res.status(500).json({ message: "Offer broadcast failed" });
  }
};