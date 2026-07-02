require('dotenv').config();  // Loads environment variables from .env file
const mongoose = require('mongoose');  // MongoDB connection
const bcrypt = require('bcryptjs');  // For password hashing
const User = require('./models/User');  // Your User model

const createSuperAdmin = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 2️⃣ Define super admin details
    const superAdminData = {
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'SuperAdmin@123',  // You can change this
      role: 'super_admin',
      isActive: true,
      permissions: ['manage_users', 'manage_roles', 'delete_data', 'export_data', 'view_reports']
    };

    // 3️⃣ Check if super admin already exists
    const existing = await User.findOne({ email: superAdminData.email });
    if (existing) {
      console.log('⚠️ Super admin already exists');
      console.log('Email:', existing.email);
      console.log('Role:', existing.role);
      process.exit(0);  // Exit successfully
    }

    // 4️⃣ Hash the password (security)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(superAdminData.password, salt);

    // 5️⃣ Create the super admin in database
    const superAdmin = await User.create({
      ...superAdminData,
      password: hashedPassword
    });

    // 6️⃣ Show success message with credentials
    console.log('✅ Super admin created successfully!');
    console.log('📧 Email:', superAdminData.email);
    console.log('🔑 Password:', superAdminData.password);
    console.log('👤 Role:', superAdmin.role);
    console.log('🆔 User ID:', superAdmin._id);

    process.exit(0);  // Exit successfully
  } catch (err) {
    // 7️⃣ Handle any errors
    console.error('❌ Error:', err.message);
    process.exit(1);  // Exit with error
  }
};

// 8️⃣ Run the function
createSuperAdmin();