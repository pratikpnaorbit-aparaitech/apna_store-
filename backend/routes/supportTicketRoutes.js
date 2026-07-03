const express = require("express");
const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");
const Notification = require("../models/Notification");
const verifyToken = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();
const clean = (value) => String(value || "").trim();

const newTicketNumber = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUP-${stamp}-${random}`;
};

router.post("/", verifyToken, allowRoles(["user"]), async (req, res, next) => {
  try {
    const subject = clean(req.body.subject);
    const description = clean(req.body.description);
    const category = clean(req.body.category).toLowerCase() || "other";
    const allowedCategories = [
      "order",
      "payment",
      "refund",
      "delivery",
      "account",
      "other",
    ];
    if (subject.length < 5)
      return res
        .status(400)
        .json({ message: "Subject must be at least 5 characters" });
    if (description.length < 10)
      return res
        .status(400)
        .json({ message: "Description must be at least 10 characters" });
    if (!allowedCategories.includes(category))
      return res.status(400).json({ message: "Invalid support category" });

    const ticket = await SupportTicket.create({
      ticketNumber: newTicketNumber(),
      user: req.user.id,
      subject,
      description,
      category,
      orderNumber: clean(req.body.orderNumber),
    });

    const superAdmins = await User.find({ role: "super_admin", isActive: true })
      .select("_id")
      .lean();
    if (superAdmins.length) {
      await Notification.insertMany(
        superAdmins.map((admin) => ({
          recipientType: "admin",
          recipientId: admin._id,
          title: "New support ticket",
          message: `${ticket.ticketNumber}: ${subject}`,
          type: "system",
        })),
      );
    }
    res
      .status(201)
      .json({ success: true, message: "Support ticket submitted", ticket });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/mine",
  verifyToken,
  allowRoles(["user"]),
  async (req, res, next) => {
    try {
      const tickets = await SupportTicket.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json({ success: true, tickets });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/",
  verifyToken,
  allowRoles(["super_admin"]),
  async (req, res, next) => {
    try {
      const query = {};
      if (req.query.status && req.query.status !== "all")
        query.status = req.query.status;
      const tickets = await SupportTicket.find(query)
        .populate("user", "name email mobile")
        .populate("handledBy", "name")
        .sort({ createdAt: -1 })
        .limit(250)
        .lean();
      res.json({ success: true, tickets });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id",
  verifyToken,
  allowRoles(["super_admin"]),
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ message: "Invalid ticket id" });
      const allowedStatuses = ["open", "in_progress", "resolved", "closed"];
      const status = clean(req.body.status);
      if (!allowedStatuses.includes(status))
        return res.status(400).json({ message: "Invalid ticket status" });
      const update = {
        status,
        adminReply: clean(req.body.adminReply),
        handledBy: req.user.id,
      };
      update.resolvedAt = ["resolved", "closed"].includes(status)
        ? new Date()
        : null;
      const ticket = await SupportTicket.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true },
      )
        .populate("user", "name email mobile")
        .populate("handledBy", "name");
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      await Notification.create({
        recipientType: "user",
        recipientId: ticket.user._id,
        title: `Support ticket ${status.replace("_", " ")}`,
        message: `${ticket.ticketNumber}${update.adminReply ? `: ${update.adminReply}` : " was updated"}`,
        type: "system",
      });
      res.json({ success: true, message: "Ticket updated", ticket });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
