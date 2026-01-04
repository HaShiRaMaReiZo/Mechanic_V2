const mysql = require('mysql2/promise');

let pool = null;

// Create MySQL connection pool
const initDatabase = async () => {
  try {
    // Handle empty password explicitly
    const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
    const dbName = process.env.DB_NAME || 'mechanic_v2';
    
    // First, connect without database to create it if needed
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
    
    const tempPool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Create database if it doesn't exist
    try {
      await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database '${dbName}' ready`);
    } catch (error) {
      console.log(`⚠️  Database creation check: ${error.message}`);
    }

    // Now create pool with database
    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: process.env.DB_USER || 'root',
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();

    // Close temp pool
    await tempPool.end();

    // Create users table if it doesn't exist
    await createUsersTable();
    
    // Create asset and maintenance tables if they don't exist
    await createAssetTable();
    await createAssetMaintenanceTable();
    
    // Create payment table if it doesn't exist
    await createMechanicPaymentTable();

    return pool;
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    throw error;
  }
};

// Create users table
const createUsersTable = async () => {
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
      address TEXT,
      last_login DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.execute(createTableSQL);
    console.log('✅ Users table ready');
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    throw error;
  }
};

// Create tbl_Asset table
const createAssetTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tbl_Asset (
      assetId INT PRIMARY KEY,
      contractId INT NOT NULL,
      chassisNo VARCHAR(255),
      engineNo VARCHAR(255),
      plateNo VARCHAR(255),
      assetProductName VARCHAR(255),
      productColor VARCHAR(255),
      INDEX idx_contractId (contractId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.execute(createTableSQL);
    console.log('✅ tbl_Asset table ready');
  } catch (error) {
    console.error('❌ Error creating tbl_Asset table:', error.message);
    throw error;
  }
};

// Create tbl_AssetMaintenance table
const createAssetMaintenanceTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tbl_AssetMaintenance (
      maintId INT PRIMARY KEY,
      assetId INT NOT NULL,
      contractId INT,
      maintDueDate DATE,
      unscheduled TINYINT(1) DEFAULT 0,
      maintenanceCode VARCHAR(255),
      mileage INT,
      estimatedMaintCost DECIMAL(10,2),
      actualMaintCost DECIMAL(10,2),
      skipped TINYINT(1) DEFAULT 0,
      dateImplemented DATETIME,
      engineOilRefilled TINYINT(1) DEFAULT 0,
      engineOilCost DECIMAL(10,2),
      chainTightened TINYINT(1) DEFAULT 0,
      chainTightenedCost DECIMAL(10,2),
      chainSprocketChanged TINYINT(1) DEFAULT 0,
      chainSprocketChangedCost DECIMAL(10,2),
      otherMaintServices TEXT,
      otherMaintServicesCost DECIMAL(10,2),
      commissionBeneficiary VARCHAR(255),
      personImplemented INT,
      dtConfirmedImplemented DATETIME,
      personConfirmedImplemented INT,
      maintLastRemark TEXT,
      maintCurrentReport TEXT,
      dtSmsSent DATETIME,
      dtCreated DATETIME,
      personCreated INT,
      dtUpdated DATETIME,
      personUpdated INT,
      dtDeleted DATETIME,
      personDeleted INT,
      deletedByParent TINYINT(1) DEFAULT 0,
      INDEX idx_assetId (assetId),
      INDEX idx_contractId (contractId),
      INDEX idx_maintDueDate (maintDueDate),
      INDEX idx_dateImplemented (dateImplemented)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.execute(createTableSQL);
    console.log('✅ tbl_AssetMaintenance table ready');
  } catch (error) {
    console.error('❌ Error creating tbl_AssetMaintenance table:', error.message);
    throw error;
  }
};

// Create tbl_MechanicPayment table
const createMechanicPaymentTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tbl_MechanicPayment (
      paymentId INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      weekStartDate DATE NOT NULL,
      weekEndDate DATE NOT NULL,
      totalAmount DECIMAL(10,2) DEFAULT 0.00,
      serviceCount INT DEFAULT 0,
      paymentStatus ENUM('pending', 'paid') DEFAULT 'pending',
      paidDate DATETIME NULL,
      paidBy INT NULL,
      remarks TEXT NULL,
      dtCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dtUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_weekStartDate (weekStartDate),
      INDEX idx_paymentStatus (paymentStatus),
      INDEX idx_user_week (userId, weekStartDate),
      UNIQUE KEY unique_user_week (userId, weekStartDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.execute(createTableSQL);
    console.log('✅ tbl_MechanicPayment table ready');
  } catch (error) {
    console.error('❌ Error creating tbl_MechanicPayment table:', error.message);
    throw error;
  }
};

// Get database pool
const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
};

// Close database connection
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection closed');
  }
};

module.exports = {
  pool,
  getDatabase,
  initDatabase,
  closeDatabase,
};
