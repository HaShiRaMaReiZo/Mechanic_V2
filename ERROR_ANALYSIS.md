# Error Analysis: "Maintenance record not found"

## 🔍 Root Cause

The error occurs because of a **database mismatch** between search and submit operations:

### **The Problem Flow**

1. **Search Operation** (`GET /api/contracts/search`):
   - Checks **Standalone DB** first for maintenance records
   - If empty, **falls back to Main DB** and returns those records
   - Returns `maintId` from **Main DB** to frontend

2. **Submit Operation** (`POST /api/contracts/:maintId/submit-service`):
   - Only checks **Standalone DB** for the `maintId`
   - If `maintId` came from **Main DB**, it won't exist in **Standalone DB**
   - Result: **"Maintenance record not found"** ❌

### **Code Evidence**

#### Search Endpoint (Line 221-253)
```javascript
// Step 3: Get maintenances from Standalone DB
let [maintResults] = await localDb.execute(maintQuery, assetIds);

// If no maintenance records in Standalone DB, try to get from Main DB
if (maintResults.length === 0) {
  console.log(`⚠️  No maintenance records in Standalone DB, checking Main DB...`);
  [maintResults] = await mainDb.execute(mainMaintQuery, assetIds);
  // ✅ Returns maintId from Main DB
}
```

#### Submit Endpoint (Line 440-453)
```javascript
// Check if maintenance record exists
const checkQuery = 'SELECT maintId, dateImplemented FROM tbl_AssetMaintenance WHERE maintId = ?';
const [checkResults] = await db.execute(checkQuery, [maintId]);
// ❌ Only checks Standalone DB!

if (checkResults.length === 0) {
  return res.status(404).json({
    success: false,
    message: 'Maintenance record not found', // ❌ Error here!
  });
}
```

---

## 🎯 The Solution

We need to handle the case where `maintId` comes from Main DB. Two approaches:

### **Option 1: Check Both Databases (Recommended)**

Update the submit endpoint to check both databases:

```javascript
// Check Standalone DB first
let [checkResults] = await db.execute(checkQuery, [maintId]);

// If not found, check Main DB
if (checkResults.length === 0) {
  const mainDb = getMainDatabase();
  [checkResults] = await mainDb.execute(checkQuery, [maintId]);
  
  // If found in Main DB, copy to Standalone DB before updating
  if (checkResults.length > 0) {
    // Copy maintenance record from Main DB to Standalone DB
    await copyMaintenanceFromMainDB(maintId);
    // Re-query Standalone DB
    [checkResults] = await db.execute(checkQuery, [maintId]);
  }
}
```

### **Option 2: Always Copy from Main DB First**

When search finds records in Main DB, automatically copy them to Standalone DB.

---

## 📊 Database Flow Diagram

### **Current (Broken) Flow**

```
Search Request
    ↓
Check Standalone DB → Empty ❌
    ↓
Check Main DB → Found ✅ (maintId = 12345)
    ↓
Return maintId to Frontend (12345)
    ↓
User clicks Confirm
    ↓
Submit Request (maintId = 12345)
    ↓
Check Standalone DB → Not Found ❌
    ↓
ERROR: "Maintenance record not found"
```

### **Fixed Flow**

```
Search Request
    ↓
Check Standalone DB → Empty ❌
    ↓
Check Main DB → Found ✅ (maintId = 12345)
    ↓
Return maintId to Frontend (12345)
    ↓
User clicks Confirm
    ↓
Submit Request (maintId = 12345)
    ↓
Check Standalone DB → Not Found ❌
    ↓
Check Main DB → Found ✅
    ↓
Copy to Standalone DB
    ↓
Update in Standalone DB ✅
```

---

## 🔧 Implementation Fix

I'll update the submit endpoint to:
1. Check Standalone DB first
2. If not found, check Main DB
3. If found in Main DB, copy the record to Standalone DB
4. Then proceed with the update

