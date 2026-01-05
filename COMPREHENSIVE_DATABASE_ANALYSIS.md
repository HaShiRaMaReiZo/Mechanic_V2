# 🗄️ COMPREHENSIVE DATABASE ANALYSIS - Mechanic V2

**Date:** January 5, 2026  
**Analysis Type:** Complete Database Architecture & Schema Analysis  
**Scope:** Dual Database System (Local + Remote)

---

## 📊 EXECUTIVE SUMMARY

The Mechanic V2 project implements a **sophisticated dual-database architecture** combining:

1. **Standalone Database (Local MySQL)** - Operational database with READ/WRITE access
2. **Main Database (Remote MySQL via SSH)** - Source of truth with READ-ONLY access

This architecture provides:
- ✅ **Performance**: Fast local queries for frequent operations
- ✅ **Independence**: Ability to work with cached data
- ✅ **Safety**: No direct modifications to production database
- ✅ **Flexibility**: Local updates without affecting source system
- ✅ **Synchronization**: Manual data sync from remote to local

---

## 🏗️ DATABASE ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  (Mobile App, Admin Web, Backend API)                           │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │                                │
    ┌────────▼────────┐              ┌────────▼────────┐
    │  Standalone DB  │              │    Main DB      │
    │   (Local)       │              │   (Remote)      │
    │                 │              │                 │
    │  localhost:3307 │              │  SSH Tunnel     │
    │  mechanic_v2    │              │  r2o_db         │
    │                 │              │                 │
    │  READ/WRITE     │              │  READ ONLY      │
    │                 │              │                 │
    │  Operations:    │              │  Source Data:   │
    │  - Auth         │              │  - Contracts    │
    │  - Maintenance  │              │  - Customers    │
    │  - Payments     │              │  - Users        │
    │  - Reviews      │              │                 │
    └─────────────────┘              └─────────────────┘
             ▲                                │
             │         Sync Script            │
             └────────────────────────────────┘
                copy-assets-maintenances.js
```

---

## 📋 DATABASE 1: STANDALONE DATABASE (Local MySQL)

### Connection Details

- **Database Name**: `mechanic_v2`
- **Host**: `localhost` or `127.0.0.1`
- **Port**: `3307`
- **User**: `root` (default, configurable)
- **Password**: Empty or configured in `.env`
- **Charset**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Engine**: InnoDB
- **Access**: **READ/WRITE** (Full CRUD operations)

### Connection File

**Location**: `backend/database/init.js`

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mechanic_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

### Tables Overview

| Table Name | Purpose | Record Type | Created By |
|------------|---------|-------------|------------|
| `users` | User authentication | Application users | App |
| `tbl_Asset` | Vehicle/Asset data | Contract assets | Sync from Main DB |
| `tbl_AssetMaintenance` | Maintenance records | Service records | Sync + Local updates |
| `tbl_MechanicPayment` | Payment tracking | Weekly payments | App |

---

## 📄 TABLE SCHEMAS - STANDALONE DATABASE

### 1. `users` Table

**Purpose**: Authentication and user management for mechanics and admins

**Schema**:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed',
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
```

**Column Details**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INT | NO | Primary key (auto increment) |
| `username` | VARCHAR(50) | NO | Unique username (lowercase) |
| `password` | VARCHAR(255) | NO | bcrypt hash ($2a$10$...) |
| `email` | VARCHAR(100) | YES | Email address |
| `first_name` | VARCHAR(50) | YES | First name |
| `last_name` | VARCHAR(50) | YES | Last name |
| `role` | ENUM | NO | 'user', 'admin', or 'mechanic' |
| `is_active` | TINYINT(1) | NO | 1 = active, 0 = deactivated |
| `phone` | VARCHAR(20) | YES | Phone number |
| `address` | TEXT | YES | Physical address |
| `last_login` | DATETIME | YES | Last login timestamp |
| `created_at` | TIMESTAMP | NO | Record creation time |
| `updated_at` | TIMESTAMP | NO | Last update time |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `username`
- INDEX: `idx_username` (for fast lookups)
- INDEX: `idx_email` (for email searches)

**Sample Data**:
```sql
INSERT INTO users (username, password, email, first_name, last_name, role, is_active)
VALUES ('ttvu1', '$2a$10$abcdefghijklmnopqrstuvwxyz...', 'ttvu1@example.com', 'John', 'Doe', 'mechanic', 1);
```

**Usage**:
- Authentication (login)
- User profile management
- Role-based access control (mechanic vs admin)
- Payment tracking (`tbl_MechanicPayment.userId` references `users.id`)

**Password Hashing**:
- Algorithm: bcrypt
- Rounds: 10
- Format: `$2a$10$[22-char-salt][31-char-hash]`
- Library: bcryptjs (Node.js)

---

### 2. `tbl_Asset` Table

**Purpose**: Store vehicle/asset information (copied from Main DB)

**Schema**:
```sql
CREATE TABLE tbl_Asset (
  assetId INT PRIMARY KEY,
  contractId INT NOT NULL,
  chassisNo VARCHAR(255),
  engineNo VARCHAR(255),
  plateNo VARCHAR(255),
  assetProductName VARCHAR(255),
  productColor VARCHAR(255),
  
  INDEX idx_contractId (contractId),
  INDEX idx_chassisNo (chassisNo),
  INDEX idx_plateNo (plateNo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Column Details**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `assetId` | INT | NO | Primary key (from Main DB) |
| `contractId` | INT | NO | Foreign key to contract |
| `chassisNo` | VARCHAR(255) | YES | Vehicle chassis number |
| `engineNo` | VARCHAR(255) | YES | Engine number |
| `plateNo` | VARCHAR(255) | YES | License plate number |
| `assetProductName` | VARCHAR(255) | YES | Product/Vehicle model name |
| `productColor` | VARCHAR(255) | YES | Vehicle color |

**Indexes**:
- PRIMARY KEY: `assetId`
- INDEX: `idx_contractId` (for contract searches)
- INDEX: `idx_chassisNo` (for chassis lookups)
- INDEX: `idx_plateNo` (for plate searches)

**Data Source**: 
- Initially copied from Main DB `tbl_Asset` table
- Sync script: `backend/scripts/copy-assets-maintenances.js`

**Sample Query**:
```sql
-- Get assets for a contract
SELECT * FROM tbl_Asset WHERE contractId = 12345;

-- Search by plate number
SELECT * FROM tbl_Asset WHERE plateNo LIKE '%ABC-1234%';
```

**Relationships**:
- Belongs to: `tbl_Contract` (Main DB) via `contractId`
- Has many: `tbl_AssetMaintenance` records via `assetId`

---

### 3. `tbl_AssetMaintenance` Table

**Purpose**: Store maintenance records (copied from Main DB + local updates)

**Schema**:
```sql
CREATE TABLE tbl_AssetMaintenance (
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
  dateImplemented DATETIME COMMENT 'NULL = not completed yet',
  
  -- Service details
  engineOilRefilled TINYINT(1) DEFAULT 0,
  engineOilCost DECIMAL(10,2),
  chainTightened TINYINT(1) DEFAULT 0,
  chainTightenedCost DECIMAL(10,2),
  chainSprocketChanged TINYINT(1) DEFAULT 0,
  chainSprocketChangedCost DECIMAL(10,2),
  otherMaintServices TEXT,
  otherMaintServicesCost DECIMAL(10,2),
  
  -- Tracking & metadata
  commissionBeneficiary VARCHAR(255),
  personImplemented INT COMMENT 'Main DB userId (not Standalone users.id)',
  dtConfirmedImplemented DATETIME,
  personConfirmedImplemented INT,
  maintLastRemark TEXT,
  maintCurrentReport TEXT COMMENT 'Image path',
  dtSmsSent DATETIME,
  dtCreated DATETIME,
  personCreated INT,
  dtUpdated DATETIME,
  personUpdated INT,
  dtDeleted DATETIME,
  personDeleted INT,
  deletedByParent TINYINT(1) DEFAULT 0,
  
  -- Review system (admin approval)
  reviewStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewedBy INT COMMENT 'Admin user ID who reviewed',
  reviewedAt DATETIME,
  reviewNotes TEXT,
  
  INDEX idx_assetId (assetId),
  INDEX idx_contractId (contractId),
  INDEX idx_maintDueDate (maintDueDate),
  INDEX idx_dateImplemented (dateImplemented),
  INDEX idx_personImplemented (personImplemented),
  INDEX idx_reviewStatus (reviewStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Column Groups**:

**A. Identification & Scheduling**:
| Column | Type | Description |
|--------|------|-------------|
| `maintId` | INT | Primary key (from Main DB) |
| `assetId` | INT | Foreign key to asset |
| `contractId` | INT | Foreign key to contract |
| `maintDueDate` | DATE | Scheduled maintenance date |
| `maintenanceCode` | VARCHAR(255) | Maintenance code identifier |
| `unscheduled` | TINYINT(1) | 1 = unscheduled maintenance |

**B. Implementation Status**:
| Column | Type | Description |
|--------|------|-------------|
| `dateImplemented` | DATETIME | When service was completed (NULL = pending) |
| `skipped` | TINYINT(1) | 1 = maintenance was skipped |
| `mileage` | INT | Vehicle mileage at service time |
| `actualMaintCost` | DECIMAL(10,2) | Total cost of service |
| `estimatedMaintCost` | DECIMAL(10,2) | Estimated cost (before service) |

**C. Service Details (Toggles + Costs)**:
| Service | Toggle Column | Cost Column |
|---------|---------------|-------------|
| Engine Oil | `engineOilRefilled` | `engineOilCost` |
| Chain Tightening | `chainTightened` | `chainTightenedCost` |
| Chain Sprocket | `chainSprocketChanged` | `chainSprocketChangedCost` |
| Other Services | - | `otherMaintServicesCost` |

**D. Documentation**:
| Column | Type | Description |
|--------|------|-------------|
| `maintCurrentReport` | TEXT | Image file path (e.g., `uploads/maintenance/maint-123-timestamp.jpg`) |
| `maintLastRemark` | TEXT | Previous remarks/notes |
| `otherMaintServices` | TEXT | Description of other services (e.g., "Service Fee") |

**E. User Tracking**:
| Column | Type | Description |
|--------|------|-------------|
| `personImplemented` | INT | **Main DB** `tbl_User.userId` (mechanic who did service) |
| `personUpdated` | INT | **Main DB** `tbl_User.userId` (last updater) |
| `personCreated` | INT | **Main DB** `tbl_User.userId` (creator) |
| `personDeleted` | INT | **Main DB** `tbl_User.userId` (deleter) |

**F. Review System (Admin Approval)**:
| Column | Type | Description |
|--------|------|-------------|
| `reviewStatus` | ENUM | 'pending', 'approved', 'rejected' |
| `reviewedBy` | INT | **Standalone DB** `users.id` (admin who reviewed) |
| `reviewedAt` | DATETIME | When review was completed |
| `reviewNotes` | TEXT | Admin's review notes/comments |

**G. Timestamps**:
| Column | Type | Description |
|--------|------|-------------|
| `dtCreated` | DATETIME | Creation timestamp |
| `dtUpdated` | DATETIME | Last update timestamp |
| `dtDeleted` | DATETIME | Soft delete timestamp (NULL = not deleted) |
| `dtConfirmedImplemented` | DATETIME | When implementation was confirmed |
| `dtSmsSent` | DATETIME | When SMS notification was sent |

**Critical Notes**:

⚠️ **User ID Complexity**:
- `personImplemented`, `personUpdated`, `personCreated`, `personDeleted` use **Main DB** `tbl_User.userId`
- `reviewedBy` uses **Standalone DB** `users.id`
- This dual-ID system requires careful mapping

**Data Flow**:
1. **Initial State**: Copied from Main DB (all columns including maintId)
2. **Service Submission**: Mobile app updates service details + sets `dateImplemented`
3. **Review**: Admin updates `reviewStatus`, `reviewedBy`, `reviewedAt`, `reviewNotes`
4. **Soft Delete**: Sets `dtDeleted` + `personDeleted` (record still exists)

**Status Logic**:
```javascript
// Maintenance status is calculated based on:
if (dateImplemented !== null) {
  // Already completed - calculate next due date (+3 months)
  status = 'ALREADY_IMPLEMENTED';
  nextDueDate = addThreeMonths(maintDueDate);
} else {
  // Not completed - check due date
  daysDiff = dueDate - today;
  
  if (daysDiff < 0) {
    status = 'OVER_DUE'; // Past due date
  } else if (daysDiff <= 7) {
    status = 'DUE'; // Within 7 days - can submit
  } else {
    status = 'NOT_YET_DUE'; // More than 7 days away
  }
}
```

**Sample Queries**:

```sql
-- Find all pending maintenances for an asset
SELECT * FROM tbl_AssetMaintenance 
WHERE assetId = 123 
  AND dateImplemented IS NULL 
  AND dtDeleted IS NULL
ORDER BY maintDueDate ASC;

-- Find all services submitted by a mechanic this week
SELECT * FROM tbl_AssetMaintenance
WHERE personImplemented = 2545
  AND dateImplemented >= '2026-01-01'
  AND dateImplemented < '2026-01-08'
  AND dtDeleted IS NULL;

-- Find all pending review services
SELECT * FROM tbl_AssetMaintenance
WHERE reviewStatus = 'pending'
  AND dateImplemented IS NOT NULL
  AND dtDeleted IS NULL
ORDER BY dateImplemented DESC;

-- Update service when mechanic submits (simplified)
UPDATE tbl_AssetMaintenance
SET dateImplemented = NOW(),
    engineOilRefilled = 1,
    engineOilCost = 5000,
    chainTightened = 1,
    chainTightenedCost = 2000,
    mileage = 50000,
    actualMaintCost = 7000,
    maintCurrentReport = 'uploads/maintenance/maint-123-timestamp.jpg',
    personImplemented = 2545,
    personUpdated = 2545,
    dtUpdated = NOW()
WHERE maintId = 123;

-- Admin approves service
UPDATE tbl_AssetMaintenance
SET reviewStatus = 'approved',
    reviewedBy = 1,  -- Standalone DB admin user ID
    reviewedAt = NOW()
WHERE maintId = 123;
```

---

### 4. `tbl_MechanicPayment` Table

**Purpose**: Track weekly payment periods for mechanics

**Schema**:
```sql
CREATE TABLE tbl_MechanicPayment (
  paymentId INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL COMMENT 'Standalone DB users.id',
  weekStartDate DATE NOT NULL COMMENT 'Monday of the week',
  weekEndDate DATE NOT NULL COMMENT 'Sunday of the week',
  totalAmount DECIMAL(10,2) DEFAULT 0.00,
  serviceCount INT DEFAULT 0,
  paymentStatus ENUM('pending', 'paid') DEFAULT 'pending',
  paidDate DATETIME NULL,
  paidBy INT NULL COMMENT 'Admin user ID who marked as paid',
  remarks TEXT NULL,
  dtCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dtUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_userId (userId),
  INDEX idx_weekStartDate (weekStartDate),
  INDEX idx_paymentStatus (paymentStatus),
  INDEX idx_user_week (userId, weekStartDate),
  UNIQUE KEY unique_user_week (userId, weekStartDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Column Details**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `paymentId` | INT | NO | Primary key (auto increment) |
| `userId` | INT | NO | **Standalone DB** `users.id` (mechanic) |
| `weekStartDate` | DATE | NO | Monday of payment week |
| `weekEndDate` | DATE | NO | Sunday of payment week |
| `totalAmount` | DECIMAL(10,2) | NO | Total earnings for the week |
| `serviceCount` | INT | NO | Number of services completed |
| `paymentStatus` | ENUM | NO | 'pending' or 'paid' |
| `paidDate` | DATETIME | YES | When payment was made |
| `paidBy` | INT | YES | Admin user ID who processed payment |
| `remarks` | TEXT | YES | Payment notes/remarks |
| `dtCreated` | TIMESTAMP | NO | Record creation time |
| `dtUpdated` | TIMESTAMP | NO | Last update time |

**Constraints**:
- UNIQUE: `(userId, weekStartDate)` - One payment record per user per week
- INDEX: Fast lookups by user, week, and status

**Week Calculation**:
```javascript
// Week runs Monday to Sunday
const day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
const daysToMonday = day === 0 ? 6 : day - 1;

const monday = new Date(date);
monday.setDate(date.getDate() - daysToMonday);
monday.setHours(0, 0, 0, 0);

const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
sunday.setHours(23, 59, 59, 999);
```

**Data Flow**:
1. **Service Submission**: When mechanic submits service, backend:
   - Calculates current week (Monday-Sunday)
   - Gets/creates payment record for this week
   - Updates `totalAmount` and `serviceCount`

2. **Payment Processing**: Admin marks payment as paid:
   - Sets `paymentStatus = 'paid'`
   - Sets `paidDate`
   - Sets `paidBy` (admin user ID)
   - Optionally adds `remarks`

**Sample Queries**:

```sql
-- Get current week payment for a mechanic
SELECT * FROM tbl_MechanicPayment
WHERE userId = 5
  AND weekStartDate = '2026-01-05'  -- Current Monday
LIMIT 1;

-- Get all pending payments
SELECT mp.*, u.username, u.first_name, u.last_name
FROM tbl_MechanicPayment mp
JOIN users u ON mp.userId = u.id
WHERE mp.paymentStatus = 'pending'
ORDER BY mp.weekStartDate DESC;

-- Get payment history for a mechanic (last 10 weeks)
SELECT * FROM tbl_MechanicPayment
WHERE userId = 5
ORDER BY weekStartDate DESC
LIMIT 10;

-- Mark payment as paid
UPDATE tbl_MechanicPayment
SET paymentStatus = 'paid',
    paidDate = NOW(),
    paidBy = 1,  -- Admin user ID
    remarks = 'Paid via bank transfer'
WHERE paymentId = 123;

-- Calculate total unpaid amount for a mechanic
SELECT SUM(totalAmount) as unpaid_total
FROM tbl_MechanicPayment
WHERE userId = 5
  AND paymentStatus = 'pending';
```

**Important Notes**:

⚠️ **Duplicate Prevention**: The script `backend/routes/history.js` includes logic to detect and remove duplicate payment records that may occur due to week boundary calculation issues.

```javascript
// Check for overlapping payment records and delete them
const [overlappingRecords] = await db.execute(
  `SELECT paymentId FROM tbl_MechanicPayment 
   WHERE userId = ? AND (
     (weekStartDate <= ? AND weekEndDate >= ?) OR
     (weekStartDate = ? OR weekEndDate = ?)
   )`,
  [userId, weekStartStr, weekStartStr, weekStartStr, weekEndStr]
);

if (overlappingRecords.length > 0) {
  // Delete duplicates
  await db.execute(
    `DELETE FROM tbl_MechanicPayment 
     WHERE paymentId IN (${ids.join(',')})`,
    duplicateIds
  );
}
```

---

## 📋 DATABASE 2: MAIN DATABASE (Remote MySQL via SSH)

### Connection Details

- **Database Name**: `r2o_db` (Rent-to-Own Database)
- **Host**: `123.253.22.20` (SSH tunnel)
- **SSH Port**: `22`
- **MySQL Port**: `3306` (remote) → Dynamic local port (e.g., 33061)
- **User**: Configured in `.env` (default: `r2o_admin`)
- **Password**: Configured in `.env`
- **Access**: **READ ONLY** (SELECT queries only)
- **Connection Method**: SSH tunnel with key authentication

### SSH Tunnel Configuration

**Location**: `backend/database/main-db.js`

**SSH Client**: `ssh2` library

**Authentication Methods**:
1. **SSH Key** (preferred):
   - Key Path: `C:/Users/HP/.ssh/id_rsa` (or from `.env`)
   - Passphrase: From `.env` `MAIN_SSH_KEY_PASSPHRASE`
   
2. **SSH Password** (fallback):
   - Password: From `.env` `MAIN_SSH_PASSWORD`

**Connection Flow**:
```javascript
1. Create SSH client
2. Connect to remote server (123.253.22.20:22)
3. Establish SSH tunnel (port forwarding)
4. Create local TCP server on random port
5. Create MySQL connection pool through local port
6. MySQL connection: localhost:[random_port] → remote:3306
```

**Example**:
```
App → localhost:45678 → SSH Tunnel → 123.253.22.20:22 → localhost:3306 → r2o_db
```

### Tables Overview

| Table Name | Purpose | Access | Used For |
|------------|---------|--------|----------|
| `tbl_Contract` | Contract master data | READ | Contract search |
| `tbl_Customer` | Customer information | READ | Customer details |
| `tbl_Asset` | Asset/Vehicle data | READ | Data sync source |
| `tbl_AssetMaintenance` | Maintenance records | READ | Data sync source |
| `tbl_User` | System users | READ | User ID mapping |

---

## 📄 TABLE SCHEMAS - MAIN DATABASE

### 1. `tbl_Contract` Table

**Purpose**: Master contract information (source of truth)

**Key Columns** (subset, not complete schema):
```sql
tbl_Contract (
  contractId INT PRIMARY KEY,
  contractNo VARCHAR(255),
  strippedContractNo VARCHAR(255) COMMENT 'Normalized contract number',
  accStrippedContractNo VARCHAR(255) COMMENT 'Account stripped contract number',
  contractDate DATE,
  customerId INT,
  -- ... many more columns ...
)
```

**Important Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `contractId` | INT | Primary key |
| `contractNo` | VARCHAR(255) | Contract number (e.g., "632044-WCSV1") |
| `strippedContractNo` | VARCHAR(255) | Normalized version for searching |
| `accStrippedContractNo` | VARCHAR(255) | Account version |
| `contractDate` | DATE | Contract start date |
| `customerId` | INT | Foreign key to `tbl_Customer` |

**Usage**:
- Contract search by number (partial match on multiple columns)
- Get contract details (date, customer reference)

**Sample Query**:
```sql
SELECT 
  c.contractId,
  c.contractNo,
  c.contractDate,
  c.customerId,
  cust.customerFullName,
  cust.phoneNo1
FROM tbl_Contract c
LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
WHERE c.contractNo LIKE '%632044%'
   OR c.strippedContractNo LIKE '%632044%'
   OR c.accStrippedContractNo LIKE '%632044%'
LIMIT 1;
```

---

### 2. `tbl_Customer` Table

**Purpose**: Customer information

**Key Columns**:
```sql
tbl_Customer (
  customerId INT PRIMARY KEY,
  customerFullName VARCHAR(255),
  phoneNo1 VARCHAR(50),
  phoneNo2 VARCHAR(50),
  -- ... more columns ...
)
```

**Important Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `customerId` | INT | Primary key |
| `customerFullName` | VARCHAR(255) | Customer full name |
| `phoneNo1` | VARCHAR(50) | Primary phone number |
| `phoneNo2` | VARCHAR(50) | Secondary phone number |

**Usage**:
- JOINed with `tbl_Contract` to get customer details
- Display customer name and phone in mobile app

---

### 3. `tbl_Asset` Table (Main DB)

**Purpose**: Vehicle/asset master data (source for Standalone DB)

**Schema**: Same as Standalone DB `tbl_Asset`

**Sync Direction**: Main DB → Standalone DB (one-way)

---

### 4. `tbl_AssetMaintenance` Table (Main DB)

**Purpose**: Maintenance records master data (source for Standalone DB)

**Schema**: Similar to Standalone DB, but may have different columns

**Sync Direction**: Main DB → Standalone DB (one-way, initial sync only)

**Important Notes**:
- Initial data copied to Standalone DB
- Local updates to Standalone DB **DO NOT** sync back to Main DB
- Main DB records are the source of truth
- If Main DB changes, must re-sync manually

---

### 5. `tbl_User` Table

**Purpose**: System user accounts (for user ID mapping)

**Key Columns**:
```sql
tbl_User (
  userId INT PRIMARY KEY,
  userName VARCHAR(255),
  userFullName VARCHAR(255),
  -- ... more columns ...
)
```

**Important Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `userId` | INT | Primary key (Main DB user ID) |
| `userName` | VARCHAR(255) | Username (maps to Standalone `users.username`) |
| `userFullName` | VARCHAR(255) | Full name |

**Usage**:
- Map Main DB `userId` to Standalone DB `users.id` by matching `userName`
- Used in `tbl_AssetMaintenance.personImplemented` field
- JWT token includes both `userId` (Standalone) and `mainDbUserId` (Main DB)

**Mapping Example**:
```javascript
// JWT payload structure
{
  userId: 5,              // Standalone DB users.id
  mainDbUserId: 2545,     // Main DB tbl_User.userId
  iat: ...,
  exp: ...
}
```

---

## 🔄 DATA SYNCHRONIZATION

### Sync Script: `copy-assets-maintenances.js`

**Location**: `backend/scripts/copy-assets-maintenances.js`

**Purpose**: Copy assets and maintenance records from Main DB to Standalone DB

**Process**:

```
┌─────────────────────────────────────────────────────────┐
│              SYNCHRONIZATION WORKFLOW                   │
└─────────────────────────────────────────────────────────┘

Step 1: Initialize both database connections
   - Connect to Main DB (via SSH tunnel)
   - Connect to Standalone DB (direct)

Step 2: Copy tbl_Asset
   ┌──────────────┐         ┌──────────────┐
   │   Main DB    │  READ   │ Standalone   │
   │              │ ──────> │              │
   │  tbl_Asset   │         │  tbl_Asset   │
   └──────────────┘         └──────────────┘
   
   - SELECT * FROM Main DB tbl_Asset
   - For each asset:
     - INSERT INTO Standalone DB
     - ON DUPLICATE KEY UPDATE (if exists)
   
   Result: All assets copied/updated

Step 3: Copy tbl_AssetMaintenance
   ┌──────────────────┐         ┌──────────────────┐
   │   Main DB        │  READ   │ Standalone       │
   │                  │ ──────> │                  │
   │  tbl_Asset       │         │  tbl_Asset       │
   │  Maintenance     │         │  Maintenance     │
   └──────────────────┘         └──────────────────┘
   
   - SELECT * FROM Main DB tbl_AssetMaintenance
   - For each maintenance record:
     - INSERT INTO Standalone DB
     - ON DUPLICATE KEY UPDATE (if exists)
   
   Result: All maintenance records copied/updated

Step 4: Close connections
   - Close Main DB connection
   - Close Standalone DB connection
```

**Usage**:
```bash
cd backend
node scripts/copy-assets-maintenances.js
```

**Output Example**:
```
📦 Starting data migration from Main DB to Standalone DB...
================================================================================
📡 Initializing Main Database (via SSH)...
✅ SSH connection established
✅ SSH tunnel established on local port 45678
✅ Connected to main database via SSH tunnel

📡 Initializing Standalone Database (localhost)...
✅ Connected to MySQL database
✅ Users table ready
✅ tbl_Asset table ready
✅ tbl_AssetMaintenance table ready
✅ Both databases connected

================================================================================
📋 Step 1: Copying Assets from Main DB to Standalone DB
================================================================================

📊 Found 1,234 assets in Main DB

   Processed: 1234/1234

✅ Assets migration completed:
   ✅ Inserted: 856
   🔄 Updated: 378
   ❌ Errors: 0
   📦 Total: 1234

================================================================================
📋 Step 2: Copying Maintenance Records from Main DB to Standalone DB
================================================================================

📊 Found 5,678 maintenance records in Main DB

   Processed: 5678/5678

✅ Maintenance records migration completed:
   ✅ Inserted/Updated: 5678
   ❌ Errors: 0
   📦 Total: 5678

================================================================================
✅ Data migration completed successfully!
================================================================================

💡 Next steps:
   1. Test the contract search endpoint
   2. Verify that assets and maintenances are accessible
   3. New maintenance records will be created/updated in Standalone DB
```

**Important Notes**:

⚠️ **One-Way Sync**: Data flows **Main DB → Standalone DB** only. Local updates do NOT sync back.

⚠️ **Manual Sync**: Must run script manually when Main DB data changes.

⚠️ **Duplicate Handling**: Uses `ON DUPLICATE KEY UPDATE` to handle existing records.

⚠️ **Primary Key Preservation**: `assetId` and `maintId` from Main DB are preserved in Standalone DB.

---

## 🔗 DATABASE RELATIONSHIPS

### Complete Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN DATABASE (Remote)                  │
│                           READ ONLY                             │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  tbl_Contract    │
    │  PK: contractId  │
    │  FK: customerId  │───┐
    └────────┬─────────┘   │
             │              │
             │              ▼
             │         ┌──────────────────┐
             │         │  tbl_Customer    │
             │         │  PK: customerId  │
             │         └──────────────────┘
             │
             │ contractId (link for sync)
             │
┌────────────┴──────────────────────────────────────────────────┐
│                    DATA SYNC (Manual)                          │
│              copy-assets-maintenances.js                       │
└────────────┬──────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STANDALONE DATABASE (Local)                  │
│                         READ/WRITE                              │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  tbl_Asset       │
    │  PK: assetId     │
    │  FK: contractId  │
    └────────┬─────────┘
             │
             │ assetId
             │
             ▼
    ┌────────────────────────┐
    │  tbl_AssetMaintenance  │
    │  PK: maintId           │
    │  FK: assetId           │
    │  FK: contractId        │
    │  FK: personImplemented │──┐ (Main DB userId)
    └────────┬───────────────┘  │
             │                  │
             │ (service data)   │
             │                  │
             ▼                  │
    ┌────────────────────┐     │
    │  users             │     │
    │  PK: id            │     │
    │  (Standalone)      │     │
    └────────┬───────────┘     │
             │                  │
             │ userId           │
             │                  │
             ▼                  │
    ┌────────────────────┐     │
    │  tbl_Mechanic      │     │
    │  Payment           │     │
    │  PK: paymentId     │     │
    │  FK: userId        │     │
    │  UNIQUE: (userId,  │     │
    │   weekStartDate)   │     │
    └────────────────────┘     │
                               │
                               │ (for ID mapping)
                               │
    ┌──────────────────┐       │
    │  tbl_User        │◄──────┘
    │  PK: userId      │  (Main DB)
    │  userName        │
    └──────────────────┘
```

### Relationship Details

**1. Main DB Relationships**:
- `tbl_Contract.customerId` → `tbl_Customer.customerId`
- `tbl_Asset.contractId` → `tbl_Contract.contractId`
- `tbl_AssetMaintenance.assetId` → `tbl_Asset.assetId`
- `tbl_AssetMaintenance.contractId` → `tbl_Contract.contractId`

**2. Standalone DB Relationships**:
- `tbl_Asset.contractId` → References Main DB `tbl_Contract.contractId` (not enforced)
- `tbl_AssetMaintenance.assetId` → `tbl_Asset.assetId`
- `tbl_AssetMaintenance.contractId` → References Main DB `tbl_Contract.contractId`
- `tbl_AssetMaintenance.personImplemented` → Main DB `tbl_User.userId`
- `tbl_MechanicPayment.userId` → `users.id`

**3. Cross-Database Relationships**:
- Standalone `users.username` ⟷ Main DB `tbl_User.userName` (mapping by username)
- Standalone `tbl_AssetMaintenance.personImplemented` → Main DB `tbl_User.userId`

**Foreign Key Constraints**:
- ❌ **No foreign key constraints** between Standalone DB and Main DB tables
- ✅ Local foreign keys within Standalone DB would break sync (not used)
- ✅ Referential integrity maintained at application level

---

## 🔑 USER ID MAPPING SYSTEM

### The Dual User ID Problem

**Challenge**: Two separate user ID systems

1. **Standalone DB** (`users` table):
   - Primary key: `users.id` (auto increment)
   - Used for: Authentication, payment tracking
   - Example: `id = 5`

2. **Main DB** (`tbl_User` table):
   - Primary key: `tbl_User.userId`
   - Used for: Service tracking, audit logs
   - Example: `userId = 2545`

### Mapping Strategy

**By Username**: Link users by matching `username` ⟷ `userName`

```javascript
// During login:
const standaloneUser = await db.execute(
  'SELECT id, username FROM users WHERE username = ?',
  ['ttvu1']
);
// Result: { id: 5, username: 'ttvu1' }

const mainDbUser = await mainDb.execute(
  'SELECT userId FROM tbl_User WHERE userName = ?',
  ['ttvu1']
);
// Result: { userId: 2545 }

// Generate JWT with both IDs:
const token = jwt.sign({
  userId: 5,              // Standalone DB
  mainDbUserId: 2545      // Main DB
}, SECRET);
```

### JWT Token Structure

```javascript
{
  userId: 5,              // Standalone DB users.id
  mainDbUserId: 2545,     // Main DB tbl_User.userId
  iat: 1704470400,
  exp: 1705075200
}
```

### Usage Examples

**1. Payment Tracking** (uses Standalone `userId`):
```sql
SELECT * FROM tbl_MechanicPayment
WHERE userId = 5;  -- Standalone DB users.id
```

**2. Service Tracking** (uses Main DB `userId`):
```sql
SELECT * FROM tbl_AssetMaintenance
WHERE personImplemented = 2545;  -- Main DB tbl_User.userId
```

**3. Admin Review** (uses Standalone `userId`):
```sql
UPDATE tbl_AssetMaintenance
SET reviewedBy = 1  -- Standalone DB admin users.id
WHERE maintId = 123;
```

### Helper Functions

**File**: `backend/routes/contracts.js`, `backend/routes/history.js`

```javascript
// Get Standalone DB user ID from token
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, SECRET);
  return decoded.userId;  // Standalone DB users.id
};

// Get Main DB user ID from token (with fallback lookup)
const getMainDbUserIdFromToken = async (req) => {
  const decoded = jwt.verify(token, SECRET);
  
  // Try token first
  if (decoded.mainDbUserId) {
    return decoded.mainDbUserId;
  }
  
  // Fallback: lookup by username
  const [users] = await standaloneDb.execute(
    'SELECT username FROM users WHERE id = ?',
    [decoded.userId]
  );
  
  const [mainUsers] = await mainDb.execute(
    'SELECT userId FROM tbl_User WHERE userName = ?',
    [users[0].username]
  );
  
  return mainUsers[0]?.userId || null;
};
```

### Fixing Mapping Issues

**Script**: `backend/scripts/fix-person-implemented-mapping.js`

**Purpose**: Fix services that have Main DB user IDs in fields that should have Standalone DB IDs

**Process**:
1. Find all `personImplemented` values in Standalone DB
2. Check if they exist in Standalone `users` table
3. If not, look them up in Main DB `tbl_User`
4. Map to Standalone DB `users.id` by matching username
5. Update all affected services

---

## 📊 QUERY PATTERNS

### Contract Search Query

**Purpose**: Search for contract and get all related data

**Flow**:
```sql
-- Step 1: Query Main DB for contract + customer
SELECT 
  c.contractId,
  c.contractNo,
  c.contractDate,
  c.customerId,
  cust.customerFullName,
  cust.phoneNo1
FROM tbl_Contract c
LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
WHERE c.contractNo LIKE '%632044%'
   OR c.strippedContractNo LIKE '%632044%'
   OR c.accStrippedContractNo LIKE '%632044%'
LIMIT 1;

-- Step 2: Query Standalone DB for assets
SELECT * FROM tbl_Asset
WHERE contractId = 12345;  -- From step 1

-- Step 3: Query Standalone DB for maintenance
SELECT * FROM tbl_AssetMaintenance
WHERE assetId IN (123, 456)  -- From step 2
ORDER BY maintDueDate DESC;

-- Step 4: Calculate maintenance status (application logic)
```

### Service Submission Query

**Purpose**: Update maintenance record when mechanic submits service

```sql
UPDATE tbl_AssetMaintenance
SET 
  dateImplemented = NOW(),
  engineOilRefilled = 1,
  engineOilCost = 5000.00,
  chainTightened = 1,
  chainTightenedCost = 2000.00,
  chainSprocketChanged = 0,
  chainSprocketChangedCost = NULL,
  otherMaintServices = 'Service Fee',
  otherMaintServicesCost = 1000.00,
  mileage = 50000,
  actualMaintCost = 8000.00,
  maintCurrentReport = 'uploads/maintenance/maint-123-1704470400000.jpg',
  personImplemented = 2545,  -- Main DB userId
  personUpdated = 2545,
  dtUpdated = NOW(),
  reviewStatus = 'pending'
WHERE maintId = 123
  AND dateImplemented IS NULL;  -- Prevent double submission
```

### Payment Period Query

**Purpose**: Get or create payment record for current week

```sql
-- Check if payment record exists
SELECT * FROM tbl_MechanicPayment
WHERE userId = 5
  AND weekStartDate = '2026-01-05'  -- Current Monday
LIMIT 1;

-- If not exists, create it
INSERT INTO tbl_MechanicPayment (
  userId, weekStartDate, weekEndDate, 
  totalAmount, serviceCount, paymentStatus
) VALUES (
  5, '2026-01-05', '2026-01-11',
  8000.00, 1, 'pending'
);

-- If exists, update it
UPDATE tbl_MechanicPayment
SET totalAmount = totalAmount + 8000.00,
    serviceCount = serviceCount + 1,
    dtUpdated = NOW()
WHERE userId = 5
  AND weekStartDate = '2026-01-05';
```

### Admin Review Query

**Purpose**: Approve or reject submitted service

```sql
-- Approve service
UPDATE tbl_AssetMaintenance
SET reviewStatus = 'approved',
    reviewedBy = 1,  -- Admin users.id
    reviewedAt = NOW()
WHERE maintId = 123;

-- Reject service with notes
UPDATE tbl_AssetMaintenance
SET reviewStatus = 'rejected',
    reviewedBy = 1,
    reviewedAt = NOW(),
    reviewNotes = 'Image quality is poor, please resubmit'
WHERE maintId = 123;
```

---

## 🛠️ DATABASE UTILITY SCRIPTS

### 1. `copy-assets-maintenances.js`
- **Purpose**: Sync assets and maintenance from Main DB to Standalone DB
- **Usage**: `node backend/scripts/copy-assets-maintenances.js`
- **Frequency**: Manual (when Main DB data changes)

### 2. `find-available-maintenance.js`
- **Purpose**: Find all contracts due for maintenance
- **Usage**: `node backend/scripts/find-available-maintenance.js`
- **Output**: List of contracts with status DUE (within 7 days)

### 3. `fix-person-implemented-mapping.js`
- **Purpose**: Fix user ID mapping issues
- **Usage**: `node backend/scripts/fix-person-implemented-mapping.js`
- **When**: After user imports or when services don't show in history

### 4. `import-users-csv.js`
- **Purpose**: Import mechanics from CSV file
- **Usage**: `node backend/scripts/import-users-csv.js path/to/Users.csv`
- **Features**:
  - Imports only mechanics (filters by userType)
  - Handles password hashing (bcrypt)
  - Skips inactive users
  - Handles duplicate usernames

### 5. `hash-passwords.js`
- **Purpose**: Hash plain text passwords in database
- **Usage**: `node backend/scripts/hash-passwords.js`
- **When**: After manual user creation or CSV import with plain passwords

### 6. `check-table-columns.js`
- **Purpose**: Display table structures
- **Usage**: `node backend/scripts/check-table-columns.js`
- **Output**: Column names and types for all tables

### 7. `check-customer-table.js`
- **Purpose**: Find customer-related tables in Main DB
- **Usage**: `node backend/scripts/check-customer-table.js`
- **Output**: List of customer tables and columns

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Password Security

**Standalone DB**:
- ✅ All passwords hashed with bcrypt (10 rounds)
- ✅ No plain text passwords stored
- ✅ Password comparison via bcrypt.compare()

**Main DB**:
- ✅ Passwords may be pre-hashed (format: `$2y$10$...`)
- ✅ bcryptjs can verify `$2y$` hashes (compatible)

### 2. SQL Injection Prevention

**Pattern**: Always use parameterized queries

```javascript
// ✅ GOOD - Parameterized query
const [results] = await db.execute(
  'SELECT * FROM users WHERE username = ?',
  [username]
);

// ❌ BAD - String concatenation (vulnerable)
const [results] = await db.execute(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

### 3. SSH Tunnel Security

**Benefits**:
- ✅ MySQL port not exposed to internet
- ✅ Encrypted connection via SSH
- ✅ Key-based authentication (more secure than password)
- ✅ Passphrase-protected key

**Configuration**:
- Private key: `C:/Users/HP/.ssh/id_rsa`
- Key passphrase: Stored in `.env`
- OR password authentication: From `.env`

### 4. Database Access Control

**Standalone DB**:
- Local access only (localhost:3307)
- Root user with configurable password
- Connection pooling limits concurrent connections

**Main DB**:
- SSH tunnel required (no direct access)
- READ ONLY access (application enforced)
- Connection through non-privileged account

### 5. Soft Deletes

**Pattern**: Never hard delete records

```sql
-- ✅ GOOD - Soft delete
UPDATE tbl_AssetMaintenance
SET dtDeleted = NOW(),
    personDeleted = ?
WHERE maintId = ?;

-- ❌ BAD - Hard delete (data loss)
DELETE FROM tbl_AssetMaintenance
WHERE maintId = ?;
```

---

## 📈 PERFORMANCE CONSIDERATIONS

### 1. Indexes

**Standalone DB**:
- ✅ Primary keys on all ID columns
- ✅ Foreign key indexes (`contractId`, `assetId`, `userId`)
- ✅ Query optimization indexes (`maintDueDate`, `dateImplemented`)
- ✅ Unique constraints where needed

### 2. Connection Pooling

**Configuration**:
```javascript
// Standalone DB pool
{
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true
}

// Main DB pool (via SSH)
{
  connectionLimit: 5,  // Lower for SSH tunnel
  queueLimit: 0,
  waitForConnections: true
}
```

### 3. Query Optimization

**Best Practices**:
- ✅ Use indexes for WHERE clauses
- ✅ Limit result sets with LIMIT
- ✅ Use JOINs efficiently
- ✅ Avoid SELECT * (specify columns)
- ✅ Use prepared statements (parameterized queries)

**Example**:
```sql
-- ✅ OPTIMIZED
SELECT c.contractId, c.contractNo, cust.customerFullName
FROM tbl_Contract c
LEFT JOIN tbl_Customer cust USING (customerId)
WHERE c.contractNo LIKE ?
LIMIT 1;

-- ❌ SLOW
SELECT *
FROM tbl_Contract c, tbl_Customer cust
WHERE c.customerId = cust.customerId
  AND c.contractNo LIKE '%search%';
```

### 4. Caching Opportunities

**Current State**: No caching implemented

**Recommendations**:
- ⚠️ Cache contract search results (short TTL)
- ⚠️ Cache payment period calculations
- ⚠️ Cache user profile data
- ⚠️ Consider Redis for session storage

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: Duplicate Payment Records

**Symptom**: Multiple payment records for same user and week

**Cause**: Week boundary calculation differences

**Solution**: Cleanup script in `backend/routes/history.js`

```javascript
// Delete overlapping payment records
const [overlapping] = await db.execute(
  `DELETE FROM tbl_MechanicPayment 
   WHERE userId = ? AND (
     (weekStartDate <= ? AND weekEndDate >= ?) OR
     (weekStartDate <= ? AND weekEndDate >= ?)
   )`,
  [userId, weekStart, weekStart, weekEnd, weekEnd]
);
```

### Issue 2: Service Not Showing in History

**Symptom**: Mechanic submitted service but it doesn't appear in history

**Cause**: `personImplemented` has wrong user ID

**Solution**: Run `fix-person-implemented-mapping.js` script

```bash
node backend/scripts/fix-person-implemented-mapping.js
```

### Issue 3: Contract Not Found

**Symptom**: Search returns "Contract not found" but it exists

**Cause**: Assets/maintenance not synced to Standalone DB

**Solution**: Run sync script

```bash
node backend/scripts/copy-assets-maintenances.js
```

### Issue 4: SSH Connection Failed

**Symptom**: Cannot connect to Main DB

**Causes & Solutions**:
- ❌ SSH key passphrase wrong → Check `.env` `MAIN_SSH_KEY_PASSPHRASE`
- ❌ SSH key file not found → Verify `MAIN_SSH_KEY_PATH` in `.env`
- ❌ SSH password wrong → Check `MAIN_SSH_PASSWORD` in `.env`
- ❌ Remote server down → Contact server administrator
- ❌ Firewall blocking port 22 → Check network settings

### Issue 5: Password Not Working

**Symptom**: User cannot login with correct password

**Causes & Solutions**:
- ❌ Password not hashed → Run `hash-passwords.js` script
- ❌ Wrong bcrypt version → Check hash format ($2a$ vs $2y$)
- ❌ User inactive → Check `is_active` field in database
- ❌ Username case mismatch → Usernames stored lowercase

---

## 📚 DATABASE MAINTENANCE

### Daily Tasks
- ✅ Monitor connection pool usage
- ✅ Check for failed queries in logs
- ✅ Verify SSH tunnel is active

### Weekly Tasks
- ✅ Backup Standalone DB
- ✅ Check for orphaned records
- ✅ Review payment record integrity
- ✅ Sync assets/maintenance if Main DB changed

### Monthly Tasks
- ✅ Optimize tables (OPTIMIZE TABLE)
- ✅ Review and archive old data
- ✅ Update user mappings if needed
- ✅ Review and update indexes

### Backup Strategy

**Standalone DB Backup**:
```bash
# Export database
mysqldump -h localhost -P 3307 -u root mechanic_v2 > backup.sql

# Restore database
mysql -h localhost -P 3307 -u root mechanic_v2 < backup.sql
```

**Important Tables to Backup**:
- `users` - Critical (authentication)
- `tbl_AssetMaintenance` - Critical (service records)
- `tbl_MechanicPayment` - Critical (payment tracking)
- `tbl_Asset` - Important (can be re-synced)

---

## 🎯 SUMMARY

### Database Architecture Highlights

✅ **Dual Database System**: Local + Remote for performance and safety  
✅ **One-Way Sync**: Main DB → Standalone DB (source of truth preserved)  
✅ **SSH Tunnel**: Secure remote access without exposing MySQL port  
✅ **Dual User IDs**: Complex but functional mapping system  
✅ **Soft Deletes**: Data preservation with audit trail  
✅ **Comprehensive Indexing**: Optimized for query performance  
✅ **Payment Tracking**: Automated weekly payment periods  
✅ **Review System**: Admin approval workflow for services  

### Key Tables

1. **`users`** - Authentication, roles, mechanic profiles
2. **`tbl_Asset`** - Vehicle/asset information
3. **`tbl_AssetMaintenance`** - Service records (most complex table)
4. **`tbl_MechanicPayment`** - Weekly payment tracking

### Critical Relationships

- Standalone `users.username` ⟷ Main DB `tbl_User.userName`
- `tbl_AssetMaintenance.personImplemented` → Main DB `tbl_User.userId`
- `tbl_MechanicPayment.userId` → Standalone `users.id`
- `tbl_Asset.contractId` → Main DB `tbl_Contract.contractId`

### Data Flow

```
Contract Search: Main DB (contracts) + Standalone DB (assets + maintenance)
Service Submit: Standalone DB only (local updates)
Payment Track: Standalone DB only (local calculation)
User Auth: Standalone DB only (local verification)
Data Sync: Main DB → Standalone DB (manual)
```

### Maintenance Notes

⚠️ **Manual Sync Required**: Run `copy-assets-maintenances.js` when Main DB changes  
⚠️ **User ID Mapping**: May need `fix-person-implemented-mapping.js` after user imports  
⚠️ **Payment Cleanup**: Automatic duplicate detection and removal  
⚠️ **SSH Tunnel**: Must be active for Main DB access  
⚠️ **Soft Deletes**: Check `dtDeleted IS NULL` in all queries  

---

**End of Comprehensive Database Analysis**

*This document provides complete understanding of the database architecture, schemas, relationships, and data flow in the Mechanic V2 project. Use this as reference for development, troubleshooting, and future database modifications.*

