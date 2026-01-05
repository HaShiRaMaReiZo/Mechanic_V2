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
  database: process.env.DB_NAME || 'admin-web',
};

// This script assumes you've already imported systemUser.sql into a table called 'untitled_name'
// in the admin-web database via phpMyAdmin

async function importUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check for imported table (could be untitled_name or other name)
    const [allTables] = await connection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? 
       AND table_name NOT IN ('users', 'tbl_Asset', 'tbl_AssetMaintenance', 'tbl_MechanicPayment')
       ORDER BY table_name`,
      [dbConfig.database]
    );

    console.log(`\n📋 Found ${allTables.length} tables in database:`);
    allTables.forEach(t => console.log(`   - ${t.table_name}`));

    let sourceTable = null;
    // Try to find the imported table
    for (const table of allTables) {
      const tableName = table.table_name;
      // Check if this table has the columns we need
      try {
        const [columns] = await connection.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
           AND COLUMN_NAME IN ('userId', 'userName', 'loginPassword', 'userType')`,
          [dbConfig.database, tableName]
        );
        console.log(`   Checking ${tableName}: found ${columns.length} matching columns`);
        if (columns.length >= 4) {
          sourceTable = tableName;
          console.log(`   ✅ ${tableName} has all required columns!`);
          break;
        }
      } catch (e) {
        console.log(`   ⚠️  Error checking ${tableName}: ${e.message}`);
        continue;
      }
    }

    if (!sourceTable) {
      console.error('\n❌ Could not find imported user table!');
      console.log('\n💡 The table should have these columns: userId, userName, loginPassword, userType');
      console.log('\n📋 Please do this:');
      console.log('   1. Open phpMyAdmin');
      console.log('   2. Select "admin-web" database');
      console.log('   3. Import systemUser.sql file');
      console.log('   4. Check what table name was created');
      console.log('   5. Then run this script again');
      process.exit(1);
    }

    console.log(`\n✅ Using source table: ${sourceTable}`);

    // Get all users from source table where userType = 'user'
    // Note: Using query() instead of execute() because table name can't be parameterized
    const [users] = await connection.query(
      `SELECT userId, userName, loginPassword, noticeEmail, userFullName, loginActive, userType
       FROM \`${sourceTable}\` 
       WHERE userName IS NOT NULL AND userName != '' AND userType = 'user'`
    );

    console.log(`📖 Found ${users.length} users to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if user already exists
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE username = ? OR mainDbUserId = ?',
          [user.userName, user.userId]
        );

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Hash password (if it's not already hashed)
        let hashedPassword = user.loginPassword;
        if (!hashedPassword || hashedPassword === 'invalid') {
          // Set default password
          hashedPassword = await bcrypt.hash('password123', 10);
        } else if (!hashedPassword.startsWith('$2')) {
          // If password is not bcrypt hashed, hash it
          hashedPassword = await bcrypt.hash(hashedPassword, 10);
        }

        // Parse full name
        const fullName = user.userFullName || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(' ') || null;

        // Insert user with admin role (since userType = 'user' means they should be admin)
        await connection.execute(
          `INSERT INTO users (username, password, email, first_name, last_name, role, is_active, mainDbUserId)
           VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`,
          [
            user.userName,
            hashedPassword,
            user.noticeEmail || null,
            firstName,
            lastName,
            user.loginActive === 1 ? 1 : 0,
            user.userId,
          ]
        );

        imported++;
        if (imported % 100 === 0) {
          console.log(`   Imported ${imported} users...`);
        }
      } catch (error) {
        console.error(`   Error importing ${user.userName}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Show admin users
    const [admins] = await connection.execute(
      "SELECT id, username, email FROM users WHERE role = 'admin' AND is_active = 1"
    );

    console.log('\n👑 Admin Users:');
    if (admins.length === 0) {
      console.log('   ⚠️  No admin users found!');
      console.log('   Run: node scripts/create-admin.js <username> <password>');
    } else {
      admins.forEach(admin => {
        console.log(`   - ${admin.username} (ID: ${admin.id})`);
      });
    }

    await connection.end();
    console.log('\n✅ Import complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

importUsers();

