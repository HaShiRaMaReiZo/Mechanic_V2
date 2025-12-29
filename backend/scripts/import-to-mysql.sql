-- ============================================
-- Import Mechanic Users to MySQL Database
-- ============================================
-- This script helps you import users from your main system
-- Run this in phpMyAdmin SQL tab or MySQL command line
-- ============================================

-- Step 1: Create the database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS mechanic_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mechanic_v2;

-- Step 2: Create users table (if it doesn't exist)
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

-- Step 3: Import users from your exported data
-- Option A: If you exported as CSV, use phpMyAdmin Import feature
-- Option B: If you have SQL INSERT statements, paste them here
-- Option C: Use the INSERT statements below as template

-- Example: Insert users from your main system
-- Replace 'your_main_database' with your actual database name
-- Replace 'tbl_User' with your actual table name

INSERT INTO users (username, password, email, role, created_at, updated_at)
SELECT 
  SUBSTRING_INDEX(email, '@', 1) AS username,
  '$2a$10$YourHashedPasswordHere' AS password,  -- You'll need to hash passwords
  email,
  'mechanic' AS role,
  created_at,
  updated_at
FROM your_main_database.tbl_User
WHERE userType = 'mechanic'
ON DUPLICATE KEY UPDATE 
  email = VALUES(email),
  updated_at = NOW();

-- ============================================
-- IMPORTANT: After importing, you need to:
-- 1. Hash all passwords using bcrypt
-- 2. Use the Node.js script to hash passwords:
--    node scripts/hash-passwords.js
-- ============================================

