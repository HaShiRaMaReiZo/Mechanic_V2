require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Import users from CSV file to MySQL
 * CSV format: username,password,email,first_name,last_name,role
 * Or: username,email,userType (will extract username from email)
 */

async function importUsersFromCSV(csvFilePath) {
  console.log('📥 Importing users from CSV to MySQL...\n');
  console.log('='.repeat(50));

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  // Initialize database
  await initDatabase();
  const db = getDatabase();
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'Mechanic123';

  console.log(`📄 Reading file: ${csvFilePath}`);
  console.log(`🔐 Default password: ${defaultPassword}\n`);

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  // Skip header if present
  const header = lines[0];
  const isHeader =
    header.toLowerCase().includes('username') || header.toLowerCase().includes('email');
  const dataLines = isHeader ? lines.slice(1) : lines;

  console.log(`📊 Found ${dataLines.length} users to import\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const columns = line.split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''));

    // Try to extract username from different formats
    let username = columns[0];
    let email = columns[1] || '';
    let firstName = columns[2] || '';
    let lastName = columns[3] || '';
    let role = columns[4] || 'mechanic';

    // If first column is email, extract username
    if (username.includes('@')) {
      email = username;
      username = username.split('@')[0];
    } else if (email && email.includes('@')) {
      // Username is first, email is second
    } else {
      // Just username
      email = email || `${username}@example.com`;
    }

    // Normalize role
    role = role.toLowerCase();
    if (!['user', 'admin', 'mechanic'].includes(role)) {
      role = 'mechanic';
    }

    try {
      // Check if user already exists
      const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [
        username.toLowerCase().trim(),
      ]);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${username} (already exists)`);
        skipped++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Insert user
      await db.execute(
        `INSERT INTO users (username, password, email, first_name, last_name, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [username.toLowerCase().trim(), hashedPassword, email || null, firstName || null, lastName || null, role]
      );

      console.log(`✅ Imported: ${username}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${username}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${dataLines.length}\n`);

  if (imported > 0) {
    console.log('✅ Users imported successfully!');
    console.log(`   Default password: ${defaultPassword}`);
    console.log('   Users can now login with their username and this password.\n');
  }

  process.exit(0);
}

// Get CSV file path from command line argument
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('❌ Please provide CSV file path');
  console.error('   Usage: node import-from-csv-to-mysql.js <path-to-csv-file>');
  console.error('   Example: node import-from-csv-to-mysql.js users.csv');
  process.exit(1);
}

importUsersFromCSV(csvFilePath).catch(console.error);

