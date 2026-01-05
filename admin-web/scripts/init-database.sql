-- Create users table in admin-web database
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
  mainDbUserId INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_mainDbUserId (mainDbUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import users from systemUser.sql
-- Note: You need to first import the systemUser.sql into a temporary table
-- Then run this query to copy data to users table

-- Step 1: Import systemUser.sql into a temporary table (run in phpMyAdmin)
-- Step 2: Then run this to copy to users table:

INSERT INTO users (username, password, email, first_name, role, is_active, mainDbUserId)
SELECT 
  userName,
  loginPassword,
  noticeEmail,
  userFullName,
  'user',
  loginActive,
  userId
FROM untitled_name
WHERE userName IS NOT NULL AND userName != ''
ON DUPLICATE KEY UPDATE username = username;

-- Step 3: Make at least one user an admin (change username as needed)
UPDATE users SET role = 'admin' WHERE username = 'ttvu1';

