require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');
const bcrypt = require('bcryptjs');

/**
 * Hash all user passwords in the database
 * Run this after importing users from your main system
 */

async function hashAllPasswords() {
  console.log('🔐 Hashing all user passwords...\n');
  console.log('='.repeat(50));

  try {
    // Initialize database
    await initDatabase();
    const db = getDatabase();

    // Get all users
    const [users] = await db.execute('SELECT id, username, password FROM users');

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      return;
    }

    console.log(`📊 Found ${users.length} users to process\n`);

    let hashed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
          console.log(`⏭️  Skipping ${user.username} (password already hashed)`);
          skipped++;
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Update in database
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        console.log(`✅ Hashed password for: ${user.username}`);
        hashed++;
      } catch (error) {
        console.error(`❌ Error processing ${user.username}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Hashed: ${hashed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${users.length}\n`);

    if (hashed > 0) {
      console.log('✅ Password hashing completed!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

hashAllPasswords();

