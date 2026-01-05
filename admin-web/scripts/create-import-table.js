require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin-web',
};

async function createTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Create the untitled_name table based on the SQL structure
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`untitled_name\` (
        \`userId\` INT NOT NULL,
        \`employeeId\` INT NULL,
        \`employeeCode\` VARCHAR(50) NULL,
        \`isCommercialAssistant\` TINYINT(1) DEFAULT 0,
        \`phoneAgentId\` INT NULL,
        \`phoneExtension\` VARCHAR(20) NULL,
        \`isUserAccount\` TINYINT(1) DEFAULT 1,
        \`userType\` VARCHAR(50) NULL,
        \`userImagePath\` VARCHAR(255) NULL,
        \`userName\` VARCHAR(100) NULL,
        \`userFullName\` VARCHAR(255) NULL,
        \`userPosition\` VARCHAR(255) NULL,
        \`userRemark\` TEXT NULL,
        \`password\` VARCHAR(255) NULL,
        \`loginPassword\` VARCHAR(255) NULL,
        \`officeStaff\` TINYINT(1) DEFAULT 0,
        \`workPlaceId\` INT NULL,
        \`salesAreaId\` INT NULL,
        \`managingSalesAreaIds\` VARCHAR(255) NULL,
        \`posLimited\` TINYINT(1) DEFAULT 0,
        \`loginActive\` TINYINT(1) DEFAULT 1,
        \`dtDeactivated\` DATETIME NULL,
        \`personDeactivated\` INT NULL,
        \`deactivatedRemark\` TEXT NULL,
        \`posId\` INT NULL,
        \`checkDeviceImei\` TINYINT(1) DEFAULT 0,
        \`androidId\` VARCHAR(255) NULL,
        \`deviceBOApp\` TINYINT(1) DEFAULT 0,
        \`deviceLTOApp\` TINYINT(1) DEFAULT 0,
        \`deviceMechanicApp\` TINYINT(1) DEFAULT 0,
        \`fcmToken\` TEXT NULL,
        \`noticeEmail\` VARCHAR(255) NULL,
        \`noticeEmail2\` VARCHAR(255) NULL,
        \`noticeMobile\` VARCHAR(50) NULL,
        \`noticeMobile2\` VARCHAR(50) NULL,
        \`changePassRequired\` TINYINT(1) DEFAULT 0,
        \`changePassRequiredAt\` DATETIME NULL,
        \`remember_token\` VARCHAR(255) NULL,
        \`dtCreated\` DATETIME NULL,
        \`personCreated\` INT NULL,
        \`dtUpdated\` DATETIME NULL,
        \`personUpdated\` INT NULL,
        \`dtDeleted\` DATETIME NULL,
        \`personDeleted\` INT NULL,
        PRIMARY KEY (\`userId\`),
        INDEX idx_userName (\`userName\`),
        INDEX idx_userType (\`userType\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('✅ Created untitled_name table\n');

    // Check if table is empty
    const [count] = await connection.query('SELECT COUNT(*) as count FROM `untitled_name`');
    console.log(`📊 Current rows in untitled_name: ${count[0].count}\n`);

    if (count[0].count === 0) {
      console.log('💡 Now you can:');
      console.log('   1. Go to phpMyAdmin');
      console.log('   2. Select "admin-web" database');
      console.log('   3. Click "Import" tab');
      console.log('   4. Choose systemUser.sql file');
      console.log('   5. Click "Go"');
      console.log('\n   OR run: npm run import-from-file');
    } else {
      console.log('✅ Table already has data!');
      console.log('   You can now run: npm run import-users');
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createTable();

