const { getDatabase, initDatabase } = require('../database/init');

const connectDB = async () => {
  try {
    await initDatabase();
    const db = getDatabase();
    console.log('✅ MySQL database connected');
    return db;
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

