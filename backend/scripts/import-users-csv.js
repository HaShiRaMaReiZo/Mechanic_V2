require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');
const bcrypt = require('bcryptjs');
const fs = require('fs');

/**
 * Import users from the exported Users.csv file
 * This script handles the specific CSV format from the main system
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

  // Parse CSV header to find column indices
  const header = lines[0].split(',');
  const getColumnIndex = (name) => {
    return header.findIndex((col) => col.toLowerCase() === name.toLowerCase());
  };

  const userNameIndex = getColumnIndex('userName');
  const passwordIndex = getColumnIndex('password');
  const loginPasswordIndex = getColumnIndex('loginPassword');
  const userTypeIndex = getColumnIndex('userType');
  const userFullNameIndex = getColumnIndex('userFullName');
  const noticeEmailIndex = getColumnIndex('noticeEmail');
  const noticeMobileIndex = getColumnIndex('noticeMobile');
  const loginActiveIndex = getColumnIndex('loginActive');

  console.log('📋 CSV Columns detected:');
  console.log(`   Username: column ${userNameIndex}`);
  console.log(`   User Type: column ${userTypeIndex}`);
  console.log(`   Full Name: column ${userFullNameIndex}`);
  console.log(`   Email: column ${noticeEmailIndex}`);
  console.log(`   Mobile: column ${noticeMobileIndex}\n`);

  // Skip header
  const dataLines = lines.slice(1);

  console.log(`📊 Found ${dataLines.length} users to process\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    // Parse CSV line (handling quoted fields)
    const columns = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim()); // Add last column

    // Extract data
    const userName = columns[userNameIndex] || '';
    const userType = columns[userTypeIndex] || '';
    const userFullName = columns[userFullNameIndex] || '';
    const noticeEmail = columns[noticeEmailIndex] || '';
    const noticeMobile = columns[noticeMobileIndex] || '';
    const loginActive = columns[loginActiveIndex] || '1';

    // Only import mechanics
    if (userType.toLowerCase() !== 'mechanic') {
      continue;
    }

    // Skip if username is empty
    if (!userName || userName.trim() === '') {
      continue;
    }

    // Skip inactive users
    if (loginActive === '0' || loginActive === 'false') {
      console.log(`⏭️  Skipping ${userName} (inactive)`);
      skipped++;
      continue;
    }

    // Extract first and last name from full name
    const nameParts = userFullName.split('/').map((n) => n.trim()).filter((n) => n);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Use existing password if available, otherwise use default
    const existingPassword = columns[passwordIndex] || columns[loginPasswordIndex] || '';
    let hashedPassword;

    // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, $2y$, or $2$)
    if (existingPassword && (existingPassword.startsWith('$2a$') || existingPassword.startsWith('$2b$') || existingPassword.startsWith('$2y$') || existingPassword.startsWith('$2$'))) {
      // Password is already hashed from main database - use it directly
      // Note: Both bcryptjs and bcrypt can verify $2y$ hashes
      hashedPassword = existingPassword;
      console.log(`   Using original password hash for ${userName}`);
    } else if (existingPassword && existingPassword !== 'invalid' && existingPassword.trim() !== '') {
      // Plain text password, hash it
      hashedPassword = await bcrypt.hash(existingPassword, 10);
    } else {
      // Use default password only if no password found
      console.log(`   ⚠️  No password found for ${userName}, using default password`);
      hashedPassword = await bcrypt.hash(defaultPassword, 10);
    }

    try {
      // Check if user already exists
      const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [
        userName.toLowerCase().trim(),
      ]);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${userName} (already exists)`);
        skipped++;
        continue;
      }

      // Insert user
      await db.execute(
        `INSERT INTO users (username, password, email, first_name, last_name, role, phone, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userName.toLowerCase().trim(),
          hashedPassword,
          noticeEmail || null,
          firstName || null,
          lastName || null,
          'mechanic',
          noticeMobile || null,
          1, // is_active
        ]
      );

      console.log(`✅ Imported: ${userName}${firstName ? ` (${firstName})` : ''}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${userName}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total processed: ${dataLines.length}\n`);

  if (imported > 0) {
    console.log('✅ Users imported successfully!');
    console.log(`   Default password: ${defaultPassword}`);
    console.log('   Users can now login with their username and this password.\n');
  }

  process.exit(0);
}

// Get CSV file path from command line argument or use default
const csvFilePath = process.argv[2] || 'C:\\Users\\HP\\OneDrive\\Desktop\\Users.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error('❌ Please provide CSV file path');
  console.error('   Usage: node import-users-csv.js <path-to-csv-file>');
  console.error('   Example: node import-users-csv.js "C:\\Users\\HP\\OneDrive\\Desktop\\Users.csv"');
  process.exit(1);
}

importUsersFromCSV(csvFilePath).catch(console.error);

