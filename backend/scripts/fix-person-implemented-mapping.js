require('dotenv').config();
const { initDatabase, getDatabase, closeDatabase } = require('../database/init');
const { initMainDatabase, getMainDatabase, closeMainDatabase } = require('../database/main-db');

/**
 * Fix personImplemented mapping from Main DB user IDs to Standalone DB user IDs
 * This script:
 * 1. Finds all services in Standalone DB with personImplemented that don't exist in Standalone users table
 * 2. Looks up those user IDs in Main DB
 * 3. Maps them to Standalone DB users by username
 * 4. Updates all affected services
 */
async function fixPersonImplementedMapping() {
  try {
    console.log('🔍 Starting personImplemented mapping fix...\n');

    // Initialize databases
    await initDatabase();
    const db = getDatabase();
    
    await initMainDatabase();
    const mainDb = getMainDatabase();

    // Step 1: Get all unique personImplemented values from Standalone DB
    console.log('📊 Step 1: Finding all personImplemented values in Standalone DB...');
    const [allPersonImplemented] = await db.execute(`
      SELECT DISTINCT personImplemented 
      FROM tbl_AssetMaintenance 
      WHERE personImplemented IS NOT NULL
    `);

    console.log(`Found ${allPersonImplemented.length} unique personImplemented values\n`);

    // Step 2: Get all user IDs from Standalone DB users table
    const [standaloneUsers] = await db.execute('SELECT id, username FROM users');
    const standaloneUserMap = new Map();
    standaloneUsers.forEach(user => {
      standaloneUserMap.set(user.id, user.username);
    });

    console.log(`Standalone DB has ${standaloneUsers.length} users\n`);

    // Step 3: Find personImplemented values that don't exist in Standalone DB
    const invalidPersonImplemented = allPersonImplemented.filter(
      p => !standaloneUserMap.has(p.personImplemented)
    );

    console.log(`⚠️  Found ${invalidPersonImplemented.length} personImplemented values that don't exist in Standalone DB:`);
    invalidPersonImplemented.forEach(p => {
      console.log(`   - User ID: ${p.personImplemented}`);
    });
    console.log('');

    if (invalidPersonImplemented.length === 0) {
      console.log('✅ All personImplemented values are valid! No fixes needed.');
      await closeDatabase();
      await closeMainDatabase();
      return;
    }

    // Step 4: Create mapping from Main DB user IDs to Standalone DB user IDs
    console.log('📋 Step 2: Creating user ID mapping from Main DB to Standalone DB...');
    const userMapping = new Map();
    let mappedCount = 0;
    let unmappedCount = 0;

    for (const invalid of invalidPersonImplemented) {
      const mainDbUserId = invalid.personImplemented;

      try {
        // Find user in Main DB
        const [mainUsers] = await mainDb.execute(
          'SELECT userId, userName, userFullName FROM tbl_User WHERE userId = ?',
          [mainDbUserId]
        );

        if (mainUsers.length > 0) {
          const mainUser = mainUsers[0];
          console.log(`   Found in Main DB: userId=${mainUser.userId}, userName=${mainUser.userName}`);

          // Find corresponding user in Standalone DB by username
          const [standaloneUsers] = await db.execute(
            'SELECT id, username FROM users WHERE username = ?',
            [mainUser.userName]
          );

          if (standaloneUsers.length > 0) {
            const standaloneUser = standaloneUsers[0];
            userMapping.set(mainDbUserId, standaloneUser.id);
            console.log(`   ✅ Mapped: Main DB ${mainDbUserId} -> Standalone DB ${standaloneUser.id} (${standaloneUser.username})`);
            mappedCount++;
          } else {
            console.log(`   ❌ No matching user in Standalone DB for username: ${mainUser.userName}`);
            unmappedCount++;
          }
        } else {
          console.log(`   ❌ User ID ${mainDbUserId} not found in Main DB`);
          unmappedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error checking user ${mainDbUserId}:`, error.message);
        unmappedCount++;
      }
    }

    console.log(`\n📊 Mapping Summary:`);
    console.log(`   ✅ Successfully mapped: ${mappedCount}`);
    console.log(`   ❌ Could not map: ${unmappedCount}\n`);

    if (userMapping.size === 0) {
      console.log('⚠️  No mappings found. Cannot update services.');
      await closeDatabase();
      await closeMainDatabase();
      return;
    }

    // Step 5: Update all services with the mapped user IDs
    console.log('🔧 Step 3: Updating services in Standalone DB...');
    let updatedCount = 0;
    let errorCount = 0;

    for (const [mainDbUserId, standaloneUserId] of userMapping.entries()) {
      try {
        const [result] = await db.execute(
          `UPDATE tbl_AssetMaintenance 
           SET personImplemented = ?, personUpdated = ? 
           WHERE personImplemented = ?`,
          [standaloneUserId, standaloneUserId, mainDbUserId]
        );

        if (result.affectedRows > 0) {
          console.log(`   ✅ Updated ${result.affectedRows} service(s): Main DB ${mainDbUserId} -> Standalone DB ${standaloneUserId}`);
          updatedCount += result.affectedRows;
        }
      } catch (error) {
        console.error(`   ❌ Error updating services for user ${mainDbUserId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Fix Complete!`);
    console.log(`   📝 Services updated: ${updatedCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount}`);
    }
    if (unmappedCount > 0) {
      console.log(`   ⚠️  Unmapped user IDs: ${unmappedCount} (these services will not show in history)`);
    }

    await closeDatabase();
    await closeMainDatabase();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
fixPersonImplementedMapping()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

