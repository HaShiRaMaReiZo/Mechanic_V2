require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'admin-web';

async function setupDatabase() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL');

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' ready`);

    // Switch to the database (USE command doesn't work with prepared statements)
    await connection.query(`USE \`${dbName}\``);

    // Create users table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        role ENUM('user', 'admin', 'mechanic') DEFAULT 'user',
        is_active TINYINT(1) DEFAULT 1,
        phone VARCHAR(20),
        mainDbUserId INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_mainDbUserId (mainDbUserId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('✅ Users table created');

    // Check if users already exist
    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    const userCount = existingUsers[0].count;

    if (userCount > 0) {
      console.log(`ℹ️  ${userCount} users already exist in database`);
      console.log('   Skipping import. If you want to import users, use the import script.');
    } else {
      console.log('ℹ️  No users found. You need to import users from systemUser.sql');
      console.log('   Steps:');
      console.log('   1. Import systemUser.sql into a temporary table in phpMyAdmin');
      console.log('   2. Run: node scripts/import-users.js');
    }

    // Check for admin users
    const [admins] = await connection.query("SELECT id, username FROM users WHERE role = 'admin' AND is_active = 1");
    
    if (admins.length === 0) {
      console.log('\n⚠️  No admin users found!');
      console.log('   To create an admin user, run:');
      console.log('   node scripts/create-admin.js <username> <password>');
    } else {
      console.log('\n👑 Admin users:');
      admins.forEach(admin => {
        console.log(`   - ${admin.username} (ID: ${admin.id})`);
      });
    }

    await connection.end();
    console.log('\n✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();

