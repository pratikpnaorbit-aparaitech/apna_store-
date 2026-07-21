const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Otp = require("../models/Otp");
const { sendOtpEmail } = require("../utils/emailService");
const {
  validateForgotPasswordInput,
  validateLegacyRegistrationInput,
  validateRegistrationEmailInput,
  validateRegistrationInput,
  validateRegistrationVerificationInput,
  validateResetPasswordInput,
  validateUserLoginInput,
} = require("../utils/authInput");

const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");

const router = express.Router();

/* ================= HELPER FUNCTION ================= */

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    storeId: user.storeId || null,
    permissions: user.permissions || []
  };
}

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

async function createAndSendOtp(email, purpose, extraFields = {}) {
  const existingOtp = await Otp.findOne({ email, purpose });
  if (existingOtp && Date.now() - existingOtp.lastSentAt.getTime() < 60 * 1000) {
    const error = new Error("Please wait 60 seconds before requesting another OTP");
    error.status = 429;
    throw error;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  await Otp.findOneAndUpdate(
    { email, purpose },
    {
      otpHash: hashOtp(otp),
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      lastSentAt: new Date(),
      verified: false,
      ...extraFields,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    await sendOtpEmail({ email, otp, purpose });
  } catch (error) {
    await Otp.deleteOne({ email, purpose });
    throw error;
  }
}

async function sendRegistrationOtpHandler(req, res) {
  try {
    const registration = validateRegistrationInput(req.body);
    const duplicate = await User.findOne({
      $or: [{ email: registration.email }, { mobile: registration.mobile }],
    }).select("email mobile");
    if (duplicate) {
      const field = duplicate.email === registration.email ? "email" : "phone number";
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists`,
      });
    }

    await createAndSendOtp(registration.email, "registration", {
      registrationData: {
        name: registration.name,
        mobile: registration.mobile,
        passwordHash: await bcrypt.hash(registration.password, 10),
      },
    });
    return res.json({
      success: true,
      message: "OTP sent to your email",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
  } catch (error) {
    console.error("SEND REGISTRATION OTP ERROR:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not send OTP. Please try again.",
    });
  }
}

async function verifyRegistrationOtpHandler(req, res) {
  try {
    const { email, otp } = validateRegistrationVerificationInput(req.body);
    if (!(await verifyOtp(email, "registration", otp))) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const otpRecord = await Otp.findOne({ email, purpose: "registration" })
      .select("+registrationData.passwordHash");
    const pending = otpRecord?.registrationData;
    if (!pending?.name || !pending?.mobile || !pending?.passwordHash) {
      return res.status(400).json({ success: false, message: "Registration session expired. Request a new OTP." });
    }

    const duplicate = await User.findOne({
      $or: [{ email }, { mobile: pending.mobile }],
    }).select("email mobile");
    if (duplicate) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(409).json({ success: false, message: "An account with this email or phone number already exists" });
    }

    const user = await User.create({
      name: pending.name,
      email,
      mobile: pending.mobile,
      password: pending.passwordHash,
      role: "user",
      isEmailVerified: true,
      isActive: true,
    });
    await Otp.updateOne({ _id: otpRecord._id }, { $set: { verified: true } });
    await Otp.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("VERIFY REGISTRATION OTP ERROR:", error.message);
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email or phone number already exists" });
    }
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
}

router.post("/send-registration-otp", sendRegistrationOtpHandler);
router.post("/verify-registration-otp", verifyRegistrationOtpHandler);

async function verifyOtp(email, purpose, otp) {
  const record = await Otp.findOne({ email, purpose });
  if (!record || record.expiresAt <= new Date()) return false;
  if (record.attempts >= 5) return false;

  const suppliedHash = Buffer.from(hashOtp(String(otp || "")), "hex");
  const storedHash = Buffer.from(record.otpHash, "hex");
  const matches =
    suppliedHash.length === storedHash.length &&
    crypto.timingSafeEqual(suppliedHash, storedHash);

  if (!matches) {
    record.attempts += 1;
    await record.save();
    return false;
  }

  return true;
}

router.post("/registration-otp", async (req, res) => {
  try {
    const { email } = validateRegistrationEmailInput(req.body);
    if (await User.exists({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }
    await createAndSendOtp(email, "registration");
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("REGISTRATION OTP ERROR:", error.message);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Could not send OTP. Please try again.",
    });
  }
});

router.post("/forgot-password-otp", async (req, res) => {
  try {
    const { email } = validateForgotPasswordInput(req.body);
    if (await User.exists({ email })) {
      await createAndSendOtp(email, "password-reset");
    }
    res.json({
      success: true,
      message: "If an account exists, an OTP has been sent to that email",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD OTP ERROR:", error.message);
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Could not send OTP. Please try again.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = validateResetPasswordInput(req.body);
    if (!(await verifyOtp(email, "password-reset", otp))) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteOne({ email, purpose: "password-reset" });
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error("RESET PASSWORD ERROR:", error.message);
    return res.status(500).json({ message: "Password reset failed" });
  }
});

/* ================= REGISTER USER ================= */

router.post(
  "/register",
  verifyToken,
  allowRole(["super_admin"]),
  async (req, res) => {
    const { name, email, mobile, password, role } = req.body;

    try {
      const existingUser = await User.findOne({
        $or: [{ email }, { mobile }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists"
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email,
        mobile,
        password: hashedPassword,
        role: role || "user",
        isActive: true
      });

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: formatUser(user)
      });
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  }
);

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = validateUserLoginInput(req.body);
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: formatUser(user)
    });

  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ================= MOBILE APP EMAIL REGISTRATION ================= */

router.post("/register-app", verifyRegistrationOtpHandler);

/* ================= GET CURRENT USER ================= */

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: formatUser(user)
    });
  } catch (err) {
    console.error("GET ME ERROR:", err);

    res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
});

/* ================= PUBLIC USER REGISTRATION ================= */

router.post("/register-user", async (req, res) => {
  try {
    const { name, email, mobile, password, otp } = validateLegacyRegistrationInput(req.body);

    if (!(await verifyOtp(email, "registration", otp))) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: "user",
      isMobileVerified: false,
      isEmailVerified: true,
      isActive: true
    });

    await Otp.deleteOne({ email, purpose: "registration" });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: formatUser(user)
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error("User registration error:", error.message);

    res.status(500).json({
      message: "Registration failed"
    });
  }
});

module.exports = router;
