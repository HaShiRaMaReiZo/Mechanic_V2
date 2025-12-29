require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');

/**
 * Clear existing users and re-import with original passwords
 */

async function clearAndReimport() {
  console.log('🔄 Clearing existing users...\n');
  console.log('='.repeat(50));

  try {
    await initDatabase();
    const db = getDatabase();

    // Clear all users
    const [result] = await db.execute('DELETE FROM users');
    console.log(`✅ Deleted ${result.affectedRows} users from database\n`);

    console.log('✅ Database cleared!');
    console.log('\n📋 Now run the import script:');
    console.log('   node scripts/import-users-csv.js "C:\\Users\\HP\\OneDrive\\Desktop\\Users.csv"');
    console.log('\nThis will import users with their ORIGINAL passwords from the main database.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearAndReimport();

