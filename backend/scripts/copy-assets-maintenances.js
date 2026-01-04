require('dotenv').config();
const { initMainDatabase, getMainDatabase, closeMainDatabase } = require('../database/main-db');
const { initDatabase, getDatabase, closeDatabase } = require('../database/init');

/**
 * Copy assets and maintenance records from Main DB to Standalone DB
 * Run this script once to migrate existing data
 */

async function copyAssetsAndMaintenances() {
  console.log('📦 Starting data migration from Main DB to Standalone DB...\n');
  console.log('='.repeat(80));

  let mainDb = null;
  let localDb = null;

  try {
    // Initialize both databases
    console.log('📡 Initializing Main Database (via SSH)...\n');
    await initMainDatabase();
    mainDb = getMainDatabase();

    console.log('📡 Initializing Standalone Database (localhost)...\n');
    await initDatabase();
    localDb = getDatabase();

    console.log('✅ Both databases connected\n');

    // Step 1: Copy Assets
    console.log('='.repeat(80));
    console.log('📋 Step 1: Copying Assets from Main DB to Standalone DB');
    console.log('='.repeat(80));

    const assetQuery = `
      SELECT 
        assetId,
        contractId,
        chassisNo,
        engineNo,
        plateNo,
        assetProductName,
        productColor
      FROM tbl_Asset
    `;

    const [assets] = await mainDb.execute(assetQuery);
    console.log(`\n📊 Found ${assets.length} assets in Main DB\n`);

    if (assets.length > 0) {
      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (const asset of assets) {
        try {
          // Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates
          const insertQuery = `
            INSERT INTO tbl_Asset (
              assetId,
              contractId,
              chassisNo,
              engineNo,
              plateNo,
              assetProductName,
              productColor
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              contractId = VALUES(contractId),
              chassisNo = VALUES(chassisNo),
              engineNo = VALUES(engineNo),
              plateNo = VALUES(plateNo),
              assetProductName = VALUES(assetProductName),
              productColor = VALUES(productColor)
          `;

          const [result] = await localDb.execute(insertQuery, [
            asset.assetId,
            asset.contractId,
            asset.chassisNo,
            asset.engineNo,
            asset.plateNo,
            asset.assetProductName,
            asset.productColor,
          ]);

          // Check if it was an insert (affectedRows = 1) or update (affectedRows = 2)
          if (result.affectedRows === 1) {
            inserted++;
          } else if (result.affectedRows === 2) {
            updated++;
          }

          const totalProcessed = inserted + updated;
          if (totalProcessed % 100 === 0) {
            process.stdout.write(`\r   Processed: ${totalProcessed}/${assets.length}`);
          }
        } catch (error) {
          console.error(`\n❌ Error copying asset ${asset.assetId}: ${error.message}`);
          errors++;
        }
      }

      console.log(`\n\n✅ Assets migration completed:`);
      console.log(`   ✅ Inserted: ${inserted}`);
      console.log(`   🔄 Updated: ${updated}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   📦 Total: ${assets.length}\n`);
    } else {
      console.log('⚠️  No assets found in Main DB\n');
    }

    // Step 2: Copy Maintenance Records
    console.log('='.repeat(80));
    console.log('📋 Step 2: Copying Maintenance Records from Main DB to Standalone DB');
    console.log('='.repeat(80));

    const maintQuery = `
      SELECT 
        maintId,
        assetId,
        contractId,
        maintDueDate,
        unscheduled,
        maintenanceCode,
        mileage,
        estimatedMaintCost,
        actualMaintCost,
        skipped,
        dateImplemented,
        engineOilRefilled,
        engineOilCost,
        chainTightened,
        chainTightenedCost,
        chainSprocketChanged,
        chainSprocketChangedCost,
        otherMaintServices,
        otherMaintServicesCost,
        commissionBeneficiary,
        personImplemented,
        dtConfirmedImplemented,
        personConfirmedImplemented,
        maintLastRemark,
        maintCurrentReport,
        dtSmsSent,
        dtCreated,
        personCreated,
        dtUpdated,
        personUpdated,
        dtDeleted,
        personDeleted,
        deletedByParent
      FROM tbl_AssetMaintenance
    `;

    const [maintenances] = await mainDb.execute(maintQuery);
    console.log(`\n📊 Found ${maintenances.length} maintenance records in Main DB\n`);

    if (maintenances.length > 0) {
      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (const maint of maintenances) {
        try {
          // Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates
          const insertQuery = `
            INSERT INTO tbl_AssetMaintenance (
              maintId, assetId, contractId, maintDueDate, unscheduled, maintenanceCode,
              mileage, estimatedMaintCost, actualMaintCost, skipped, dateImplemented,
              engineOilRefilled, engineOilCost, chainTightened, chainTightenedCost,
              chainSprocketChanged, chainSprocketChangedCost, otherMaintServices,
              otherMaintServicesCost, commissionBeneficiary, personImplemented,
              dtConfirmedImplemented, personConfirmedImplemented, maintLastRemark,
              maintCurrentReport, dtSmsSent, dtCreated, personCreated, dtUpdated,
              personUpdated, dtDeleted, personDeleted, deletedByParent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              assetId = VALUES(assetId),
              contractId = VALUES(contractId),
              maintDueDate = VALUES(maintDueDate),
              unscheduled = VALUES(unscheduled),
              maintenanceCode = VALUES(maintenanceCode),
              mileage = VALUES(mileage),
              estimatedMaintCost = VALUES(estimatedMaintCost),
              actualMaintCost = VALUES(actualMaintCost),
              skipped = VALUES(skipped),
              dateImplemented = VALUES(dateImplemented),
              engineOilRefilled = VALUES(engineOilRefilled),
              engineOilCost = VALUES(engineOilCost),
              chainTightened = VALUES(chainTightened),
              chainTightenedCost = VALUES(chainTightenedCost),
              chainSprocketChanged = VALUES(chainSprocketChanged),
              chainSprocketChangedCost = VALUES(chainSprocketChangedCost),
              otherMaintServices = VALUES(otherMaintServices),
              otherMaintServicesCost = VALUES(otherMaintServicesCost),
              commissionBeneficiary = VALUES(commissionBeneficiary),
              personImplemented = VALUES(personImplemented),
              dtConfirmedImplemented = VALUES(dtConfirmedImplemented),
              personConfirmedImplemented = VALUES(personConfirmedImplemented),
              maintLastRemark = VALUES(maintLastRemark),
              maintCurrentReport = VALUES(maintCurrentReport),
              dtSmsSent = VALUES(dtSmsSent),
              dtCreated = VALUES(dtCreated),
              personCreated = VALUES(personCreated),
              dtUpdated = VALUES(dtUpdated),
              personUpdated = VALUES(personUpdated),
              dtDeleted = VALUES(dtDeleted),
              personDeleted = VALUES(personDeleted),
              deletedByParent = VALUES(deletedByParent)
          `;

          await localDb.execute(insertQuery, [
            maint.maintId,
            maint.assetId,
            maint.contractId,
            maint.maintDueDate,
            maint.unscheduled || 0,
            maint.maintenanceCode,
            maint.mileage,
            maint.estimatedMaintCost,
            maint.actualMaintCost,
            maint.skipped || 0,
            maint.dateImplemented,
            maint.engineOilRefilled || 0,
            maint.engineOilCost,
            maint.chainTightened || 0,
            maint.chainTightenedCost,
            maint.chainSprocketChanged || 0,
            maint.chainSprocketChangedCost,
            maint.otherMaintServices,
            maint.otherMaintServicesCost,
            maint.commissionBeneficiary,
            maint.personImplemented,
            maint.dtConfirmedImplemented,
            maint.personConfirmedImplemented,
            maint.maintLastRemark,
            maint.maintCurrentReport,
            maint.dtSmsSent,
            maint.dtCreated,
            maint.personCreated,
            maint.dtUpdated,
            maint.personUpdated,
            maint.dtDeleted,
            maint.personDeleted,
            maint.deletedByParent || 0,
          ]);

          inserted++;

          if (inserted % 100 === 0) {
            process.stdout.write(`\r   Processed: ${inserted}/${maintenances.length}`);
          }
        } catch (error) {
          console.error(`\n❌ Error copying maintenance ${maint.maintId}: ${error.message}`);
          errors++;
        }
      }

      console.log(`\n\n✅ Maintenance records migration completed:`);
      console.log(`   ✅ Inserted/Updated: ${inserted}`);
      console.log(`   ❌ Errors: ${errors}`);
      console.log(`   📦 Total: ${maintenances.length}\n`);
    } else {
      console.log('⚠️  No maintenance records found in Main DB\n');
    }

    console.log('='.repeat(80));
    console.log('✅ Data migration completed successfully!');
    console.log('='.repeat(80));
    console.log('\n💡 Next steps:');
    console.log('   1. Test the contract search endpoint');
    console.log('   2. Verify that assets and maintenances are accessible');
    console.log('   3. New maintenance records will be created/updated in Standalone DB\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connections
    if (mainDb) {
      await closeMainDatabase();
    }
    if (localDb) {
      await closeDatabase();
    }
  }
}

// Run the migration
copyAssetsAndMaintenances();

