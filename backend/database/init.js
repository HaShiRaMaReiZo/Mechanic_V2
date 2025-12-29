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
