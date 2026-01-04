# Database Mapping - Main DB vs Standalone DB

## 📊 Overview

This project uses a **dual database architecture**:
1. **Main Database (Remote)** - Read-only reference data
2. **Standalone Database (Local)** - Read/write operational data

---

## 🗄️ Database Details

### **Main Database (Remote via SSH)**
- **Database Name**: `r2o_db`
- **Connection**: SSH tunnel to `123.253.22.20`
- **Purpose**: Source of truth for contracts and customers
- **Access**: **READ-ONLY** (no updates/writes)
- **Connection Method**: `getMainDatabase()` from `database/main-db.js`

### **Standalone Database (Local)**
- **Database Name**: `mechanic_v2`
- **Connection**: Direct MySQL connection (localhost:3307)
- **Purpose**: Operational data, authentication, and local maintenance records
- **Access**: **READ/WRITE** (full CRUD operations)
- **Connection Method**: `getDatabase()` from `database/init.js`

---

## 📋 Table Mapping

### **Main Database (Remote) - READ ONLY**

| Table Name | Purpose | Operations | Used In |
|------------|---------|------------|---------|
| `tbl_Contract` | Contract master data | **SELECT only** | Contract search, contract lookup |
| `tbl_Customer` | Customer information | **SELECT only** | Contract search (JOIN with contracts) |

**Details:**
- These tables are the **source of truth**
- Data is **never modified** by this application
- Used only for **lookup and reference**
- Contract data is used to find `contractId`, which is then used to query local database

---

### **Standalone Database (Local) - READ/WRITE**

| Table Name | Purpose | Operations | Data Source |
|------------|---------|------------|-------------|
| `users` | User authentication | **SELECT, INSERT, UPDATE** | Created locally |
| `tbl_Asset` | Asset/Vehicle data | **SELECT, INSERT, UPDATE** | Copied from Main DB |
| `tbl_AssetMaintenance` | Maintenance records | **SELECT, INSERT, UPDATE** | Copied from Main DB, updated locally |

**Details:**
- `users` table is **completely independent** - created and managed locally
- `tbl_Asset` and `tbl_AssetMaintenance` are **synced/copied** from Main DB
- Maintenance records can be **updated locally** (e.g., when service is completed)
- Local updates do **not** sync back to Main DB

---

## 🔄 Data Flow

### **Contract Search Flow**

```
1. User searches by contract number
   ↓
2. Query Main DB (READ):
   - SELECT from tbl_Contract
   - JOIN with tbl_Customer
   - Get contractId, customerId, customer info
   ↓
3. Query Standalone DB (READ):
   - SELECT from tbl_Asset WHERE contractId = ?
   - SELECT from tbl_AssetMaintenance WHERE assetId IN (...)
   ↓
4. Combine results and return to frontend
```

### **Maintenance Update Flow**

```
1. User submits maintenance service
   ↓
2. Query Standalone DB (READ):
   - SELECT from tbl_AssetMaintenance WHERE maintId = ?
   - Check if already implemented
   ↓
3. Update Standalone DB (WRITE):
   - UPDATE tbl_AssetMaintenance
   - Set dateImplemented, mileage, costs, etc.
   ↓
4. Changes stay in Standalone DB only
   (NOT synced back to Main DB)
```

### **Authentication Flow**

```
1. User login attempt
   ↓
2. Query Standalone DB (READ):
   - SELECT from users WHERE username = ?
   ↓
3. Verify password (bcrypt)
   ↓
4. Update Standalone DB (WRITE):
   - UPDATE users SET last_login = NOW()
   ↓
5. Generate JWT token
```

---

## 📍 Code Locations

### **Main Database Usage**

**File**: `backend/routes/contracts.js`

```javascript
// Contract Search
const mainDb = getMainDatabase();
const [contractResults] = await mainDb.execute(
  `SELECT c.*, cust.customerFullName, cust.phoneNo1
   FROM tbl_Contract c
   LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
   WHERE c.contractNo LIKE ?`
);
```

**Tables Queried:**
- `tbl_Contract` - Contract information
- `tbl_Customer` - Customer information (JOIN)

**Operations**: SELECT only

---

### **Standalone Database Usage**

#### **1. Authentication**

**File**: `backend/models/User.js`
**File**: `backend/routes/auth.js`

```javascript
const db = getDatabase();
// SELECT, INSERT, UPDATE operations on 'users' table
```

**Table**: `users`
**Operations**: SELECT, INSERT, UPDATE

#### **2. Assets**

**File**: `backend/routes/contracts.js`

```javascript
const localDb = getDatabase();
const [assetResults] = await localDb.execute(
  `SELECT * FROM tbl_Asset WHERE contractId = ?`
);
```

**Table**: `tbl_Asset`
**Operations**: SELECT (read from local copy)

#### **3. Maintenance Records**

**File**: `backend/routes/contracts.js`

```javascript
// Read maintenance records
const localDb = getDatabase();
const [maintResults] = await localDb.execute(
  `SELECT * FROM tbl_AssetMaintenance WHERE assetId IN (...)`
);

// Update maintenance record (when service is submitted)
const updateQuery = `
  UPDATE tbl_AssetMaintenance
  SET dateImplemented = NOW(),
      mileage = ?,
      actualMaintCost = ?,
      ...
  WHERE maintId = ?
`;
await db.execute(updateQuery, [...]);
```

**Table**: `tbl_AssetMaintenance`
**Operations**: SELECT, UPDATE

---

## 🔐 Database Initialization

### **Standalone DB Tables Created**

**File**: `backend/database/init.js`

The following tables are **automatically created** in the standalone database:

1. **`users`** - Created from scratch
   - Used for authentication
   - No data copied from Main DB

2. **`tbl_Asset`** - Schema created, data copied separately
   - Schema matches Main DB structure
   - Data must be synced/copied from Main DB

3. **`tbl_AssetMaintenance`** - Schema created, data copied separately
   - Schema matches Main DB structure
   - Data must be synced/copied from Main DB
   - Can be updated locally

---

## 📝 Summary Table

| Database | Tables | Read/Write | Purpose |
|----------|--------|------------|---------|
| **Main DB (Remote)** | `tbl_Contract`<br>`tbl_Customer` | **READ ONLY** | Source of truth for contracts |
| **Standalone DB (Local)** | `users` | **READ/WRITE** | Authentication |
| **Standalone DB (Local)** | `tbl_Asset` | **READ** (copied from Main) | Asset data (local copy) |
| **Standalone DB (Local)** | `tbl_AssetMaintenance` | **READ/WRITE** (copied from Main, updated locally) | Maintenance records (local copy + updates) |

---

## ⚠️ Important Notes

### **Data Synchronization**

1. **Assets and Maintenance Records**:
   - Initially copied from Main DB to Standalone DB
   - Local updates to `tbl_AssetMaintenance` do **NOT** sync back to Main DB
   - If Main DB data changes, you need to re-sync manually

2. **Contract and Customer Data**:
   - Always read from Main DB (real-time)
   - Never stored locally
   - Always up-to-date

3. **User Data**:
   - Completely independent
   - No relationship to Main DB
   - Managed entirely in Standalone DB

### **Why This Architecture?**

1. **Performance**: Local database is faster for frequent queries
2. **Independence**: Can work offline with local data
3. **Safety**: Local updates don't affect production Main DB
4. **Flexibility**: Can modify maintenance records without affecting source system

---

## 🔧 Maintenance Operations

### **Reading Data**

- **Contracts/Customers**: Always from Main DB (real-time)
- **Assets**: From Standalone DB (cached copy)
- **Maintenance**: From Standalone DB (may have local updates)

### **Writing Data**

- **Users**: Standalone DB only
- **Maintenance Records**: Standalone DB only (updates stay local)
- **Contracts/Customers**: **NEVER** written (read-only from Main DB)

---

## 📊 Query Examples

### **Main DB Query (Read-Only)**

```javascript
// Get contract from Main DB
const mainDb = getMainDatabase();
const [contracts] = await mainDb.execute(
  'SELECT * FROM tbl_Contract WHERE contractNo = ?',
  [contractNo]
);
```

### **Standalone DB Query (Read/Write)**

```javascript
// Get assets from Standalone DB
const localDb = getDatabase();
const [assets] = await localDb.execute(
  'SELECT * FROM tbl_Asset WHERE contractId = ?',
  [contractId]
);

// Update maintenance in Standalone DB
await localDb.execute(
  'UPDATE tbl_AssetMaintenance SET dateImplemented = NOW() WHERE maintId = ?',
  [maintId]
);
```

---

## 🎯 Key Takeaways

1. ✅ **Main DB**: Read-only reference data (contracts, customers)
2. ✅ **Standalone DB**: Read/write operational data (users, assets, maintenance)
3. ✅ **Assets & Maintenance**: Copied from Main DB, updated locally
4. ✅ **Users**: Completely independent, managed locally
5. ✅ **No Sync Back**: Local updates don't go back to Main DB

---

## 📚 Related Files

- **Main DB Connection**: `backend/database/main-db.js`
- **Standalone DB Connection**: `backend/database/init.js`
- **Contract Routes**: `backend/routes/contracts.js`
- **Auth Routes**: `backend/routes/auth.js`
- **User Model**: `backend/models/User.js`

