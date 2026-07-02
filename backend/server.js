const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
const deliveryPartnerRoutes = require("./routes/deliveryPartnerRoutes");
require("dotenv").config();

const storeRoutes = require("./routes/storeRoutes");

const app = express();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Optional: Warn about missing optional env vars
if (!process.env.TWILIO_ACCOUNT_SID) {
  console.warn('⚠️  TWILIO_ACCOUNT_SID not set - SMS features will not work');
}

/* ======================
  Rate limiting configuration
====================== */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' // Skip rate limiting for health check
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 SMS requests per hour
  message: 'Too many SMS requests, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

/* ======================
   CORS CONFIG
====================== */
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

/* ======================
   SECURITY & MIDDLEWARE
====================== */
// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true,
}));

// Rate limiting
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Only apply SMS rate limiters if routes exist
if (fs.existsSync(path.join(__dirname, 'routes', 'smsRoutes.js'))) {
  app.use('/api/sms', smsLimiter);
}
if (fs.existsSync(path.join(__dirname, 'routes', 'otpRoutes.js'))) {
  app.use('/api/otp', smsLimiter);
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   STATIC FILES
====================== */
// Serve invoices from the legacy folder (if any)
app.use("/invoices", express.static(path.join(__dirname, "invoices")));

// Serve generated PDF bills from public/bills
const billsDir = path.join(__dirname, "public", "bills");
if (!fs.existsSync(billsDir)) {
  fs.mkdirSync(billsDir, { recursive: true });
}
app.use("/bills", express.static(billsDir));

// Serve uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

/* ======================
   MongoDB CONNECTION FUNCTION
====================== */
const connectDB = async () => {
  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    
    if (error.message.includes('bad auth')) {
      console.error('🔑 Authentication failed - check username/password');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('🌐 Network error - check cluster name in connection string');
    } else if (error.message.includes('timed out')) {
      console.error('⏰ Timeout - check IP whitelist in MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

/* ======================
   START SERVER FUNCTION
====================== */
const startServer = async () => {
  try {
    await connectDB();
    
    // Import routes
    const authRoutes = require("./routes/authRoutes");
    const inventoryRoutes = require("./routes/inventoryRoutes");
    const salesRoutes = require("./routes/salesRoutes");
    const dashboardRoutes = require("./routes/dashboardRoutes");
    const billingRoutes = require("./routes/billingRoutes");
    const customerRoutes = require("./routes/customerRoutes");
    const vendorRoutes = require("./routes/vendorRoutes");
    const reportRoutes = require("./routes/reportRoutes");
    const categoryRoutes = require("./routes/categoryRoutes");
    const bulkUploadRoutes = require("./routes/bulkUploadRoutes");
    const offerRoutes = require("./routes/offerRoutes");
    const userRoutes = require("./routes/userRoutes");
    const productRoutes = require("./routes/productRoutes");
    const orderRoutes = require("./routes/ordersRoutes");

    // Mount routes
    app.use("/api/auth", authRoutes);
    app.use("/api/inventory", inventoryRoutes);
    app.use("/api/sales", salesRoutes);
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/api/billing", billingRoutes);
    app.use("/api/customers", customerRoutes);
    app.use("/api/vendors", vendorRoutes);
    app.use("/api/reports", reportRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/bulk-upload", bulkUploadRoutes);
    app.use("/api/offers", offerRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/stores", storeRoutes);
    app.use("/api/delivery-partners", deliveryPartnerRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/orders", orderRoutes);

    /* ======================
       HEALTH CHECK
    ====================== */
    app.get("/", (req, res) => {
      res.send("✅ Store Management Backend Running");
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    /* ======================
       404 HANDLER
    ====================== */
    app.use((req, res) => {
      res.status(404).json({ 
        message: 'Route not found',
        path: req.originalUrl 
      });
    });

    /* ======================
       GLOBAL ERROR HANDLER
    ====================== */
    app.use((err, req, res, next) => {
      console.error('❌ Error:', err.stack);
      
      // Handle specific error types
      if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      if (err.name === 'ValidationError') {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: err.errors 
        });
      }
      
      if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Duplicate key error' });
      }
      
      // Default error
      res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
      console.log(`🛡️  Security: Helmet enabled, Rate limiting active`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();