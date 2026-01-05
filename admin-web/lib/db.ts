import mysql from 'mysql2/promise';

let adminPool: mysql.Pool | null = null; // For admin-web database (users)
let backendPool: mysql.Pool | null = null; // For mechanic_v2 database (maintenance data)

// Initialize admin database (for user authentication)
export const initDatabase = async () => {
  if (adminPool) return adminPool;

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'admin-web',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  adminPool = mysql.createPool(dbConfig);

  try {
    const connection = await adminPool.getConnection();
    connection.release();
    console.log('✅ Connected to admin-web database');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }

  return adminPool;
};

// Initialize backend database (for maintenance data)
export const initBackendDatabase = async () => {
  if (backendPool) return backendPool;

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.BACKEND_DB_NAME || 'mechanic_v2', // Backend database
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  backendPool = mysql.createPool(dbConfig);

  try {
    const connection = await backendPool.getConnection();
    connection.release();
    console.log('✅ Connected to mechanic_v2 database');
  } catch (error) {
    console.error('❌ Backend database connection error:', error);
    throw error;
  }

  return backendPool;
};

// Get admin database (for users)
export const getDatabase = (): mysql.Pool => {
  if (!adminPool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return adminPool;
};

// Get backend database (for maintenance data)
export const getBackendDatabase = (): mysql.Pool => {
  if (!backendPool) {
    throw new Error('Backend database not initialized. Call initBackendDatabase() first.');
  }
  return backendPool;
};

export const closeDatabase = async () => {
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
  }
  if (backendPool) {
    await backendPool.end();
    backendPool = null;
  }
};

