-- ============================================
-- Export Mechanic Users from MySQL
-- ============================================
-- Run this in your database tool to export mechanic users
-- ============================================

-- Option 1: Export as SQL INSERT statements
SELECT 
  CONCAT(
    'INSERT INTO users (username, password, created_at, updated_at) VALUES (',
    QUOTE(SUBSTRING_INDEX(email, '@', 1)), ', ',
    QUOTE('$2a$10$default_hashed_password'), ', ',
    'datetime(''now''), datetime(''now''));'
  ) AS sql_insert
FROM tbl_User
WHERE userType = 'mechanic';

-- Option 2: Export as CSV (easier to import)
SELECT 
  SUBSTRING_INDEX(email, '@', 1) AS username,
  'Mechanic123' AS default_password,
  NOW() AS created_at,
  NOW() AS updated_at
FROM tbl_User
WHERE userType = 'mechanic';

-- Option 3: Export all user data (for reference)
SELECT 
  id,
  email,
  SUBSTRING_INDEX(email, '@', 1) AS username,
  userType,
  created_at,
  updated_at
FROM tbl_User
WHERE userType = 'mechanic';

