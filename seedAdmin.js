// seedAdmin.js
// Run this ONCE to create your first admin account.
//   node seedAdmin.js
//
// It reads MONGO_URI from your existing .env (same one index.js uses),
// so run it from inside the Backend folder.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./models/Employee');

// 👉 Edit these before running, then you can delete this file (or keep it for future admins)
const ADMIN_NAME = 'Admin User';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'ChangeMe123!'; // change this — min 6 chars, matches Employee schema rule

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB.');

    const existing = await Employee.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`An account with ${ADMIN_EMAIL} already exists (role: ${existing.role}).`);
      console.log('If you want a fresh admin, use a different email above and re-run.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const admin = new Employee({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    await admin.save();

    console.log('✅ Admin account created successfully:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('You can now sign in at /signin with these credentials.');
    console.log('⚠️  Change this password after your first login, and delete/secure this script.');

    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
};

run();