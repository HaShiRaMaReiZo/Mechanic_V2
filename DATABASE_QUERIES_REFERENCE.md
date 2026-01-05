# 🔍 DATABASE QUERIES REFERENCE - Mechanic V2

**Date:** January 5, 2026  
**Purpose:** Complete reference of all SQL queries used in the application  
**Source:** backend/routes/*.js files

---

## 📊 QUERY STATISTICS

| Operation | Count | Primary Tables |
|-----------|-------|----------------|
| SELECT | 18 queries | `tbl_AssetMaintenance`, `tbl_Contract`, `users` |
| UPDATE | 8 queries | `tbl_AssetMaintenance`, `tbl_MechanicPayment`, `users` |
| INSERT | 2 queries | `tbl_MechanicPayment`, `tbl_AssetMaintenance` |
| DELETE | 1 query | `tbl_MechanicPayment` (duplicates) |

---

## 🔐 AUTHENTICATION QUERIES (auth.js)

### 1. Login - Find User by Username

**File**: `backend/routes/auth.js`  
**Endpoint**: `POST /api/auth/login`

```sql
SELECT 
  id,
  username,
  password,
  role,
  is_active,
  first_name,
  last_name,
  email
FROM users
WHERE username = ?
LIMIT 1;
```

**Purpose**: Retrieve user for authentication  
**Database**: Standalone DB  
**Parameters**: `[username]`  
**Returns**: User record with hashed password

---

### 2. Get Main DB User ID by Username

**File**: `backend/routes/auth.js`  
**Endpoint**: `POST /api/auth/login` (after local user found)

```sql
SELECT userId, userName
FROM tbl_User
WHERE userName = ?
LIMIT 1;
```

**Purpose**: Get Main DB user ID for JWT token  
**Database**: Main DB (via SSH)  
**Parameters**: `[username]`  
**Returns**: Main DB userId for ID mapping

---

### 3. Update Last Login

**File**: `backend/routes/auth.js`  
**Endpoint**: `POST /api/auth/login` (after successful auth)

```sql
UPDATE users
SET last_login = NOW()
WHERE id = ?;
```

**Purpose**: Track user login timestamp  
**Database**: Standalone DB  
**Parameters**: `[userId]`  
**Returns**: Affected rows count

---

### 4. Verify Token - Get User by ID

**File**: `backend/routes/auth.js`  
**Endpoint**: `POST /api/auth/verify`

```sql
SELECT 
  id,
  username,
  role,
  is_active,
  first_name,
  last_name,
  email
FROM users
WHERE id = ?
LIMIT 1;
```

**Purpose**: Verify JWT token and get user details  
**Database**: Standalone DB  
**Parameters**: `[userId]` (from JWT token)  
**Returns**: User record (without password)

---

## 🔍 CONTRACT SEARCH QUERIES (contracts.js)

### 5. Search Contract with Customer Info

**File**: `backend/routes/contracts.js`  
**Endpoint**: `GET /api/contracts/search`

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
WHERE c.contractNo LIKE ? 
   OR c.strippedContractNo LIKE ?
   OR c.accStrippedContractNo LIKE ?
LIMIT 1;
```

**Purpose**: Find contract by partial contract number  
**Database**: Main DB (via SSH)  
**Parameters**: `[%searchValue%, %searchValue%, %searchValue%]`  
**Returns**: Contract with customer details  
**Note**: Uses three column variations for flexible searching

---

### 6. Get Assets by Contract ID

**File**: `backend/routes/contracts.js`  
**Endpoint**: `GET /api/contracts/search` (step 2)

```sql
SELECT 
  assetId,
  contractId,
  chassisNo,
  engineNo,
  plateNo,
  assetProductName AS productName,
  productColor
FROM tbl_Asset
WHERE contractId = ?;
```

**Purpose**: Get all assets (vehicles) for a contract  
**Database**: Standalone DB  
**Parameters**: `[contractId]`  
**Returns**: Asset/vehicle records

---

### 7. Get Maintenance Records by Asset IDs

**File**: `backend/routes/contracts.js`  
**Endpoint**: `GET /api/contracts/search` (step 3)

```sql
SELECT 
  maintId,
  assetId,
  maintenanceCode,
  maintDueDate,
  chainSprocketChanged,
  chainTightened,
  engineOilRefilled,
  otherMaintServices,
  dateImplemented,
  mileage,
  actualMaintCost
FROM tbl_AssetMaintenance
WHERE assetId IN (?, ?, ...)
ORDER BY maintDueDate DESC, dateImplemented DESC;
```

**Purpose**: Get all maintenance records for assets  
**Database**: Standalone DB (fallback to Main DB if empty)  
**Parameters**: `[assetId1, assetId2, ...]` (dynamic list)  
**Returns**: Maintenance records with service details

---

### 8. Submit Maintenance Service

**File**: `backend/routes/contracts.js`  
**Endpoint**: `POST /api/contracts/submit-maintenance`

```sql
UPDATE tbl_AssetMaintenance
SET 
  dateImplemented = NOW(),
  engineOilRefilled = ?,
  engineOilCost = ?,
  chainTightened = ?,
  chainTightenedCost = ?,
  chainSprocketChanged = ?,
  chainSprocketChangedCost = ?,
  otherMaintServices = ?,
  otherMaintServicesCost = ?,
  mileage = ?,
  actualMaintCost = ?,
  maintCurrentReport = ?,
  personImplemented = ?,
  personUpdated = ?,
  dtUpdated = NOW(),
  reviewStatus = 'pending'
WHERE maintId = ?
  AND dateImplemented IS NULL;
```

**Purpose**: Record completed maintenance service  
**Database**: Standalone DB  
**Parameters**: 
- Service toggles: `[engineOilRefilled, chainTightened, chainSprocketChanged]`
- Costs: `[engineOilCost, chainTightenedCost, chainSprocketChangedCost, otherMaintServicesCost, actualMaintCost]`
- Details: `[otherMaintServices, mileage, maintCurrentReport]`
- User IDs: `[personImplemented, personUpdated]`
- Where: `[maintId]`

**Returns**: Affected rows (1 if successful)  
**Note**: `WHERE dateImplemented IS NULL` prevents double submission

---

## 📅 PAYMENT HISTORY QUERIES (history.js)

### 9. Get Services for Current Week

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/weekly-summary`

```sql
SELECT 
  maintId,
  actualMaintCost,
  dateImplemented
FROM tbl_AssetMaintenance
WHERE personImplemented = ?
  AND dateImplemented IS NOT NULL
  AND DATE(dateImplemented) >= ?
  AND DATE(dateImplemented) <= ?;
```

**Purpose**: Calculate weekly earnings for mechanic  
**Database**: Standalone DB  
**Parameters**: `[mainDbUserId, weekStartDate, weekEndDate]`  
**Returns**: Service records for calculating payment

---

### 10. Find Overlapping Payment Records

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/weekly-summary` (cleanup step)

```sql
SELECT paymentId, weekStartDate, weekEndDate 
FROM tbl_MechanicPayment 
WHERE userId = ? 
  AND (
    (weekStartDate <= ? AND weekEndDate >= ?) OR
    (weekStartDate <= ? AND weekEndDate >= ?) OR
    (weekStartDate = ? OR weekEndDate = ?)
  );
```

**Purpose**: Find duplicate/overlapping payment records  
**Database**: Standalone DB  
**Parameters**: `[userId, weekStart, weekStart, weekEnd, weekEnd, weekStart, weekEnd]`  
**Returns**: Overlapping payment records to delete

---

### 11. Delete Duplicate Payment Records

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/weekly-summary` (cleanup step)

```sql
DELETE FROM tbl_MechanicPayment 
WHERE paymentId IN (?, ?, ...);
```

**Purpose**: Remove duplicate payment records  
**Database**: Standalone DB  
**Parameters**: `[paymentId1, paymentId2, ...]` (dynamic list)  
**Returns**: Deleted rows count

---

### 12. Create or Update Payment Record

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/weekly-summary`

```sql
INSERT INTO tbl_MechanicPayment (
  userId,
  weekStartDate,
  weekEndDate,
  totalAmount,
  serviceCount,
  paymentStatus
) VALUES (?, ?, ?, ?, ?, 'pending')
ON DUPLICATE KEY UPDATE
  totalAmount = VALUES(totalAmount),
  serviceCount = VALUES(serviceCount),
  dtUpdated = NOW();
```

**Purpose**: Create or update payment record for the week  
**Database**: Standalone DB  
**Parameters**: `[userId, weekStartDate, weekEndDate, totalAmount, serviceCount]`  
**Returns**: Insert/update result  
**Note**: Uses UNIQUE constraint on `(userId, weekStartDate)` for upsert

---

### 13. Get Payment Periods for Mechanic

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/payment-periods`

```sql
SELECT 
  paymentId,
  weekStartDate,
  weekEndDate,
  totalAmount,
  serviceCount,
  paymentStatus,
  paidDate
FROM tbl_MechanicPayment
WHERE userId = ?
ORDER BY weekStartDate DESC
LIMIT 10;
```

**Purpose**: Get last 10 payment periods for mechanic  
**Database**: Standalone DB  
**Parameters**: `[userId]`  
**Returns**: Payment period history

---

### 14. Get Payment Record by Week Start Date

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/period/:weekStartDate/services` (step 1)

```sql
SELECT 
  paymentId,
  weekStartDate,
  weekEndDate,
  totalAmount,
  serviceCount,
  paymentStatus
FROM tbl_MechanicPayment
WHERE userId = ?
  AND weekStartDate = ?
LIMIT 1;
```

**Purpose**: Get specific payment period  
**Database**: Standalone DB  
**Parameters**: `[userId, weekStartDate]`  
**Returns**: Payment record for the week

---

### 15. Find Payment by Date Range (Fallback)

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/period/:weekStartDate/services` (fallback strategy)

```sql
SELECT 
  paymentId,
  weekStartDate,
  weekEndDate
FROM tbl_MechanicPayment
WHERE userId = ?
  AND ? BETWEEN weekStartDate AND weekEndDate
LIMIT 1;
```

**Purpose**: Find payment period when exact weekStartDate doesn't match  
**Database**: Standalone DB  
**Parameters**: `[userId, requestedDate]`  
**Returns**: Payment record containing the requested date

---

### 16. Correct Payment Week Start Date

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/period/:weekStartDate/services` (correction step)

```sql
UPDATE tbl_MechanicPayment
SET weekStartDate = ?,
    dtUpdated = NOW()
WHERE paymentId = ?;
```

**Purpose**: Fix incorrect weekStartDate in payment record  
**Database**: Standalone DB  
**Parameters**: `[correctWeekStartDate, paymentId]`  
**Returns**: Affected rows count

---

### 17. Get Services for Specific Week

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/period/:weekStartDate/services`

```sql
SELECT 
  am.maintId,
  am.assetId,
  am.contractId,
  am.dateImplemented,
  am.actualMaintCost,
  am.engineOilRefilled,
  am.chainTightened,
  am.chainSprocketChanged,
  am.otherMaintServices,
  am.maintCurrentReport,
  a.assetId,
  a.contractId
FROM tbl_AssetMaintenance am
INNER JOIN tbl_Asset a ON a.assetId = am.assetId
WHERE am.personImplemented = ?
  AND am.dateImplemented IS NOT NULL
  AND am.dtDeleted IS NULL
  AND DATE(am.dateImplemented) >= ?
  AND DATE(am.dateImplemented) <= ?
ORDER BY am.dateImplemented DESC;
```

**Purpose**: Get detailed service list for a payment period  
**Database**: Standalone DB  
**Parameters**: `[mainDbUserId, weekStartDate, weekEndDate]`  
**Returns**: Services with asset references

---

### 18. Get Contract and Customer for Services (Main DB)

**File**: `backend/routes/history.js`  
**Endpoint**: `GET /api/history/period/:weekStartDate/services` (for each service)

```sql
SELECT 
  c.contractNo,
  cust.customerFullName,
  cust.phoneNo1
FROM tbl_Contract c
LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
WHERE c.contractId = ?
LIMIT 1;
```

**Purpose**: Get contract and customer details for display  
**Database**: Main DB (via SSH)  
**Parameters**: `[contractId]`  
**Returns**: Contract number and customer info  
**Note**: Called for each unique contractId in services list

---

## 👨‍💼 ADMIN QUERIES (admin.js)

### 19. Get Dashboard Statistics

**File**: `backend/routes/admin.js`  
**Endpoint**: `GET /api/admin/stats`

```sql
-- Total Services
SELECT COUNT(*) as total
FROM tbl_AssetMaintenance
WHERE dateImplemented IS NOT NULL
  AND dtDeleted IS NULL;

-- Pending Services
SELECT COUNT(*) as count
FROM tbl_AssetMaintenance
WHERE reviewStatus = 'pending'
  AND dateImplemented IS NOT NULL
  AND dtDeleted IS NULL;

-- Approved Services
SELECT COUNT(*) as count
FROM tbl_AssetMaintenance
WHERE reviewStatus = 'approved'
  AND dtDeleted IS NULL;

-- Rejected Services
SELECT COUNT(*) as count
FROM tbl_AssetMaintenance
WHERE reviewStatus = 'rejected'
  AND dtDeleted IS NULL;

-- Total Users
SELECT COUNT(*) as count
FROM users
WHERE role = 'mechanic'
  AND is_active = 1;
```

**Purpose**: Dashboard statistics for admin panel  
**Database**: Standalone DB  
**Parameters**: None  
**Returns**: Various counts for dashboard widgets

---

### 20. Get All Services (Filterable)

**File**: `backend/routes/admin.js`  
**Endpoint**: `GET /api/admin/services`

```sql
SELECT 
  am.maintId,
  am.maintenanceCode,
  am.mileage,
  am.actualMaintCost,
  am.dateImplemented,
  am.engineOilRefilled,
  am.engineOilCost,
  am.chainTightened,
  am.chainTightenedCost,
  am.chainSprocketChanged,
  am.chainSprocketChangedCost,
  am.otherMaintServices,
  am.otherMaintServicesCost,
  am.maintCurrentReport,
  am.reviewStatus,
  am.reviewedBy,
  am.reviewedAt,
  am.reviewNotes,
  am.personImplemented
FROM tbl_AssetMaintenance am
WHERE am.dateImplemented IS NOT NULL 
  AND am.dtDeleted IS NULL
  [AND am.reviewStatus = ?]      -- if status filter
  [AND DATE(am.dateImplemented) >= ?]  -- if startDate filter
  [AND DATE(am.dateImplemented) <= ?]  -- if endDate filter
  [AND (am.maintenanceCode LIKE ? OR am.maintId = ?)]  -- if search filter
ORDER BY am.dateImplemented DESC
LIMIT ? OFFSET ?;
```

**Purpose**: Admin service list with filtering and pagination  
**Database**: Standalone DB  
**Parameters**: Dynamic based on filters + `[limit, offset]`  
**Returns**: Service records with review details

---

### 21. Update Service Review Status

**File**: `backend/routes/admin.js`  
**Endpoint**: `PUT /api/admin/services/:id/review`

```sql
UPDATE tbl_AssetMaintenance
SET reviewStatus = ?,
    reviewedBy = ?,
    reviewedAt = NOW(),
    reviewNotes = ?,
    dtUpdated = NOW()
WHERE maintId = ?;
```

**Purpose**: Approve or reject a service  
**Database**: Standalone DB  
**Parameters**: `[status, adminUserId, notes, maintId]`  
**Returns**: Affected rows count  
**Note**: `status` is 'approved' or 'rejected'

---

### 22. Edit Service Details

**File**: `backend/routes/admin.js`  
**Endpoint**: `PUT /api/admin/services/:id`

```sql
UPDATE tbl_AssetMaintenance
SET mileage = ?,
    actualMaintCost = ?,
    engineOilRefilled = ?,
    engineOilCost = ?,
    chainTightened = ?,
    chainTightenedCost = ?,
    chainSprocketChanged = ?,
    chainSprocketChangedCost = ?,
    otherMaintServices = ?,
    otherMaintServicesCost = ?,
    dtUpdated = NOW()
WHERE maintId = ?;
```

**Purpose**: Admin edit of service details  
**Database**: Standalone DB  
**Parameters**: Service field values + `[maintId]`  
**Returns**: Affected rows count

---

### 23. Delete Service (Soft Delete)

**File**: `backend/routes/admin.js`  
**Endpoint**: `DELETE /api/admin/services/:id`

```sql
UPDATE tbl_AssetMaintenance
SET dtDeleted = NOW(),
    personDeleted = ?
WHERE maintId = ?;
```

**Purpose**: Soft delete a service  
**Database**: Standalone DB  
**Parameters**: `[adminUserId, maintId]`  
**Returns**: Affected rows count  
**Note**: Sets deletion timestamp instead of removing record

---

### 24. Get Weekly Summaries (Admin)

**File**: `backend/routes/admin.js`  
**Endpoint**: `GET /api/admin/weekly-summary`

```sql
SELECT 
  mp.paymentId,
  mp.weekStartDate,
  mp.weekEndDate,
  mp.totalAmount,
  mp.serviceCount,
  mp.paymentStatus,
  mp.paidDate,
  u.id as userId,
  u.username,
  u.first_name,
  u.last_name
FROM tbl_MechanicPayment mp
INNER JOIN users u ON mp.userId = u.id
WHERE u.role = 'mechanic'
  [AND mp.weekStartDate >= ?]  -- if startDate filter
  [AND mp.weekEndDate <= ?]    -- if endDate filter
  [AND u.id = ?]                -- if userId filter
ORDER BY mp.weekStartDate DESC
LIMIT ? OFFSET ?;
```

**Purpose**: Admin view of all mechanic payments  
**Database**: Standalone DB  
**Parameters**: Optional filters + `[limit, offset]`  
**Returns**: Payment records with user details

---

### 25. Mark Payment as Paid

**File**: `backend/routes/admin.js`  
**Endpoint**: `PUT /api/admin/payments/:id`

```sql
UPDATE tbl_MechanicPayment
SET paymentStatus = 'paid',
    paidDate = NOW(),
    paidBy = ?,
    remarks = ?
WHERE paymentId = ?;
```

**Purpose**: Admin marks payment as processed  
**Database**: Standalone DB  
**Parameters**: `[adminUserId, remarks, paymentId]`  
**Returns**: Affected rows count

---

### 26. Get All Users

**File**: `backend/routes/admin.js`  
**Endpoint**: `GET /api/admin/users`

```sql
SELECT 
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  is_active,
  phone,
  created_at,
  last_login
FROM users
[WHERE role = ?]      -- if role filter
[AND is_active = ?]   -- if active filter
ORDER BY created_at DESC;
```

**Purpose**: Admin user management list  
**Database**: Standalone DB  
**Parameters**: Optional filters `[role, is_active]`  
**Returns**: User records (without passwords)

---

## 📊 QUERY OPTIMIZATION NOTES

### Indexes Used

All queries benefit from these indexes:

**Standalone DB**:
```sql
-- users table
PRIMARY KEY (id)
UNIQUE INDEX (username)
INDEX idx_username (username)
INDEX idx_email (email)

-- tbl_Asset
PRIMARY KEY (assetId)
INDEX idx_contractId (contractId)
INDEX idx_plateNo (plateNo)

-- tbl_AssetMaintenance
PRIMARY KEY (maintId)
INDEX idx_assetId (assetId)
INDEX idx_contractId (contractId)
INDEX idx_maintDueDate (maintDueDate)
INDEX idx_dateImplemented (dateImplemented)
INDEX idx_personImplemented (personImplemented)
INDEX idx_reviewStatus (reviewStatus)

-- tbl_MechanicPayment
PRIMARY KEY (paymentId)
INDEX idx_userId (userId)
INDEX idx_weekStartDate (weekStartDate)
INDEX idx_paymentStatus (paymentStatus)
UNIQUE KEY unique_user_week (userId, weekStartDate)
```

**Main DB**:
- Uses existing indexes (assumed optimized)

### Query Performance Tips

1. **Use parameterized queries** - All queries use `?` placeholders
2. **Limit result sets** - LIMIT clauses on most SELECT queries
3. **Index foreign keys** - All FK columns indexed
4. **Soft deletes checked** - `dtDeleted IS NULL` in WHERE clauses
5. **Date range optimization** - Use DATE() function for date comparisons
6. **Avoid SELECT \*** - Specify only needed columns

### Common Query Patterns

**Pattern 1: Upsert (Insert or Update)**
```sql
INSERT INTO table (...) VALUES (...)
ON DUPLICATE KEY UPDATE
  column = VALUES(column);
```
Used in: Payment record management

**Pattern 2: Soft Delete**
```sql
UPDATE table
SET dtDeleted = NOW(),
    personDeleted = ?
WHERE id = ?;
```
Used in: Service deletion

**Pattern 3: Date Range Filter**
```sql
WHERE DATE(dateImplemented) >= ?
  AND DATE(dateImplemented) <= ?
```
Used in: Service history, payment periods

**Pattern 4: Dynamic IN Clause**
```sql
WHERE assetId IN (?, ?, ...)
-- Generated dynamically based on array length
```
Used in: Multi-asset queries

---

## 🔄 TRANSACTION USAGE

### Current State: **No explicit transactions**

All queries run as auto-commit individual statements.

### Recommendation: Add transactions for:

1. **Service Submission** (contracts.js):
```javascript
await db.beginTransaction();
try {
  // Update tbl_AssetMaintenance
  // Update/Insert tbl_MechanicPayment
  await db.commit();
} catch (error) {
  await db.rollback();
}
```

2. **Payment Cleanup** (history.js):
```javascript
await db.beginTransaction();
try {
  // Delete duplicate records
  // Insert/Update correct record
  await db.commit();
} catch (error) {
  await db.rollback();
}
```

---

## 📚 SUMMARY

### Query Complexity Distribution

| Complexity | Count | Examples |
|------------|-------|----------|
| Simple (Single table, simple WHERE) | 12 | User lookup, payment by ID |
| Medium (JOIN, multiple conditions) | 10 | Contract search, service list |
| Complex (Dynamic filters, subqueries) | 4 | Admin services, overlapping payments |

### Most Frequently Used Tables

1. **tbl_AssetMaintenance** - 14 queries (core functionality)
2. **users** - 7 queries (authentication + admin)
3. **tbl_MechanicPayment** - 8 queries (payment tracking)
4. **tbl_Asset** - 3 queries (vehicle info)
5. **tbl_Contract** - 3 queries (Main DB lookups)

### Critical Queries (High Impact)

1. **Service Submission** - Must be accurate, affects payments
2. **Payment Calculation** - Must handle duplicates correctly
3. **Contract Search** - Main entry point for mechanics
4. **Review Approval** - Admin workflow critical path

---

**End of Database Queries Reference**

*Use this document as a quick reference when debugging, optimizing, or extending database functionality.*

