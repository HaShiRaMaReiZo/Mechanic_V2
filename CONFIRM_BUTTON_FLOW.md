# Confirm Button Flow Analysis

## 🔄 Complete Flow When "Confirm" Button is Clicked

### **Step 1: User Clicks "Continue" Button (Maintenance Data Screen)**

**File**: `mechanic_v2/app/(tabs)/maintenance-data.tsx`

```typescript
// Line 46-48
const handleContinue = () => {
  router.push('/(tabs)/services');
};
```

**Action**: Navigates to Services screen

---

### **Step 2: User Fills Service Form (Services Screen)**

**File**: `mechanic_v2/app/(tabs)/services.tsx`

**Form Fields:**
- **Service Options** (optional, toggles):
  - Engine Oil (with amount)
  - Chain Sprocket (with amount)
  - Chain Tightening (with amount)
  - Service Fee (with amount)
- **Required Fields**:
  - Mileage (required)
  - Total Amount (required)
- **Optional**:
  - Photo/Image (camera)

---

### **Step 3: User Clicks "Confirm" Button**

**File**: `mechanic_v2/app/(tabs)/services.tsx` (Line 75-155)

#### **3.1 Validation**

```typescript
// Validates required fields
if (!mileage.trim()) {
  Alert.alert('Validation Error', 'Please enter mileage');
  return;
}

if (!totalAmount.trim()) {
  Alert.alert('Validation Error', 'Please enter total amount');
  return;
}
```

#### **3.2 Find Maintenance ID**

```typescript
// Logic to find maintId:
// 1. Try to match maintenanceCode from status
// 2. If no match, find first uncompleted maintenance (no dateImplemented)
// 3. Fallback to first maintenance record
```

**Source**: Gets `maintId` from `searchResults.assets[0].maintenances[]`

#### **3.3 Prepare Service Data**

```typescript
const serviceData = {
  engineOil: engineOil.enabled ? { enabled: true, amount: engineOil.amount } : undefined,
  chainSprocket: chainSprocket.enabled ? { enabled: true, amount: chainSprocket.amount } : undefined,
  chainTightening: chainTightening.enabled ? { enabled: true, amount: chainTightening.amount } : undefined,
  serviceFee: serviceFee.enabled ? { enabled: true, amount: serviceFee.amount } : undefined,
  mileage: mileage.trim(),
  totalAmount: totalAmount.trim(),
  imageUri: imageUri,
};
```

#### **3.4 Call API**

```typescript
const result = await apiService.submitMaintenanceService(maintId, serviceData);
```

---

### **Step 4: API Service Call**

**File**: `mechanic_v2/services/api.ts` (Line 125-195)

#### **4.1 Create FormData**

```typescript
const formData = new FormData();

// Append service data as JSON strings
if (serviceData.engineOil) {
  formData.append('engineOil', JSON.stringify(serviceData.engineOil));
}
// ... same for chainSprocket, chainTightening, serviceFee

formData.append('mileage', serviceData.mileage);
formData.append('totalAmount', serviceData.totalAmount);

// Append image file if available
if (serviceData.imageUri) {
  formData.append('image', {
    uri: serviceData.imageUri,
    name: filename,
    type: type,
  });
}
```

#### **4.2 HTTP POST Request**

```typescript
const response = await fetch(`${baseUrl}/contracts/${maintId}/submit-service`, {
  method: 'POST',
  body: formData,
});
```

**Endpoint**: `POST /api/contracts/:maintId/submit-service`

---

### **Step 5: Backend Processing**

**File**: `backend/routes/contracts.js` (Line 410-562)

#### **5.1 File Upload Middleware**

```javascript
router.post('/:maintId/submit-service', upload.single('image'), async (req, res) => {
```

**Middleware**: `upload.single('image')` - Handles image upload using Multer
- Saves image to `uploads/maintenance/` directory
- Sets `req.file` with file information

#### **5.2 Parse Form Data**

```javascript
const engineOil = req.body.engineOil ? JSON.parse(req.body.engineOil) : { enabled: false, amount: '' };
const chainSprocket = req.body.chainSprocket ? JSON.parse(req.body.chainSprocket) : { enabled: false, amount: '' };
const chainTightening = req.body.chainTightening ? JSON.parse(req.body.chainTightening) : { enabled: false, amount: '' };
const serviceFee = req.body.serviceFee ? JSON.parse(req.body.serviceFee) : { enabled: false, amount: '' };
const mileage = req.body.mileage;
const totalAmount = req.body.totalAmount;
```

#### **5.3 Validation**

```javascript
// Validate required fields
if (!mileage || !totalAmount) {
  // Clean up uploaded file if validation fails
  if (req.file) {
    fs.unlinkSync(req.file.path);
  }
  return res.status(400).json({
    success: false,
    message: 'Mileage and total amount are required',
  });
}
```

#### **5.4 Check Maintenance Record Exists**

```javascript
const checkQuery = 'SELECT maintId, dateImplemented FROM tbl_AssetMaintenance WHERE maintId = ?';
const [checkResults] = await db.execute(checkQuery, [maintId]);

if (checkResults.length === 0) {
  // Clean up uploaded file
  if (req.file) {
    fs.unlinkSync(req.file.path);
  }
  return res.status(404).json({
    success: false,
    message: 'Maintenance record not found',
  });
}
```

**Database**: Queries **Standalone DB** (`tbl_AssetMaintenance`)

#### **5.5 Check If Already Implemented**

```javascript
if (checkResults[0].dateImplemented) {
  // Clean up uploaded file
  if (req.file) {
    fs.unlinkSync(req.file.path);
  }
  return res.status(400).json({
    success: false,
    message: 'This maintenance has already been implemented',
  });
}
```

**Prevention**: Prevents duplicate submissions

#### **5.6 Prepare Image Path**

```javascript
let imagePath = null;
if (req.file) {
  imagePath = `uploads/maintenance/${req.file.filename}`;
}
```

#### **5.7 Prepare Other Services**

```javascript
let otherMaintServices = null;
let otherMaintServicesCost = null;
if (serviceFee.enabled && serviceFee.amount) {
  otherMaintServices = 'Service Fee';
  otherMaintServicesCost = parseFloat(serviceFee.amount) || null;
}
```

#### **5.8 Update Maintenance Record**

```javascript
const updateQuery = `
  UPDATE tbl_AssetMaintenance
  SET 
    dateImplemented = NOW(),                    // ✅ Mark as completed
    engineOilRefilled = ?,                      // 1 or 0
    engineOilCost = ?,                          // Amount or null
    chainTightened = ?,                         // 1 or 0
    chainTightenedCost = ?,                     // Amount or null
    chainSprocketChanged = ?,                   // 1 or 0
    chainSprocketChangedCost = ?,              // Amount or null
    otherMaintServices = ?,                     // 'Service Fee' or null
    otherMaintServicesCost = ?,                // Amount or null
    mileage = ?,                                // Mileage value
    actualMaintCost = ?,                        // Total amount
    maintCurrentReport = ?,                     // Image path or null
    personImplemented = ?,                      // User ID (currently hardcoded: 2545)
    dtUpdated = NOW(),                          // Update timestamp
    personUpdated = ?                           // User ID (currently hardcoded: 2545)
  WHERE maintId = ?
`;
```

**Database**: Updates **Standalone DB** (`tbl_AssetMaintenance`)

**Key Updates:**
- ✅ `dateImplemented = NOW()` - **Marks maintenance as completed**
- ✅ Service flags (engineOilRefilled, chainTightened, chainSprocketChanged)
- ✅ Service costs
- ✅ Mileage
- ✅ Total cost (`actualMaintCost`)
- ✅ Image path (`maintCurrentReport`)
- ✅ User tracking (`personImplemented`, `personUpdated`)

#### **5.9 Return Updated Record**

```javascript
const [updatedResults] = await db.execute(
  'SELECT maintId, dateImplemented, maintCurrentReport FROM tbl_AssetMaintenance WHERE maintId = ?',
  [maintId]
);

res.json({
  success: true,
  message: 'Maintenance service submitted successfully',
  data: {
    maintId: updatedResults[0].maintId,
    dateImplemented: updatedResults[0].dateImplemented,
    imagePath: updatedResults[0].maintCurrentReport,
  },
});
```

---

### **Step 6: Frontend Response Handling**

**File**: `mechanic_v2/app/(tabs)/services.tsx` (Line 137-154)

#### **6.1 Success Response**

```typescript
if (result.success) {
  Alert.alert('Success', 'Maintenance service submitted successfully!', [
    {
      text: 'OK',
      onPress: () => {
        router.back(); // Navigate back to maintenance data screen
      },
    },
  ]);
}
```

#### **6.2 Error Response**

```typescript
else {
  Alert.alert('Error', result.message || 'Failed to submit maintenance service');
}
```

---

## 📊 Database Changes

### **What Gets Updated**

**Table**: `tbl_AssetMaintenance` (in **Standalone DB**)

| Field | Value | Description |
|-------|-------|-------------|
| `dateImplemented` | `NOW()` | **Marks maintenance as completed** |
| `engineOilRefilled` | `1` or `0` | Whether engine oil was refilled |
| `engineOilCost` | Amount or `NULL` | Cost of engine oil |
| `chainTightened` | `1` or `0` | Whether chain was tightened |
| `chainTightenedCost` | Amount or `NULL` | Cost of chain tightening |
| `chainSprocketChanged` | `1` or `0` | Whether chain sprocket was changed |
| `chainSprocketChangedCost` | Amount or `NULL` | Cost of chain sprocket |
| `otherMaintServices` | `'Service Fee'` or `NULL` | Other services description |
| `otherMaintServicesCost` | Amount or `NULL` | Cost of other services |
| `mileage` | Number | Vehicle mileage |
| `actualMaintCost` | Number | Total maintenance cost |
| `maintCurrentReport` | Image path or `NULL` | Path to uploaded image |
| `personImplemented` | `2545` (hardcoded) | User who implemented |
| `dtUpdated` | `NOW()` | Update timestamp |
| `personUpdated` | `2545` (hardcoded) | User who updated |

### **Important Notes**

1. ✅ **Updates Standalone DB Only**: Changes are **NOT** synced back to Main DB
2. ✅ **Marks as Completed**: `dateImplemented` is set, preventing duplicate submissions
3. ✅ **Image Storage**: Image is saved to `backend/uploads/maintenance/` directory
4. ✅ **User Tracking**: Currently uses hardcoded user ID `2545` (should use auth token)

---

## 🔄 Impact on Status Calculation

### **Before Confirmation**

- Status: `DUE` (if within 7 days of due date)
- `dateImplemented`: `NULL`
- Continue button: **Visible**

### **After Confirmation**

- Status: `ALREADY_IMPLEMENTED` (on next search)
- `dateImplemented`: Current timestamp
- Continue button: **Hidden** (status is no longer `DUE`)

**Why?** The `calculateMaintenanceStatus()` function checks:
- If `dateImplemented` exists → Status becomes `ALREADY_IMPLEMENTED`
- Or calculates next maintenance date (3 months after)

---

## ⚠️ Potential Issues

### **1. Maintenance ID Not Found**

**Error**: "Maintenance ID not found. Please search for a contract first."

**Cause**: 
- No maintenance records in search results
- Maintenance records not synced to Standalone DB

**Solution**: Run `copy-assets-maintenances.js` script to sync data

### **2. Already Implemented**

**Error**: "This maintenance has already been implemented"

**Cause**: 
- `dateImplemented` is already set
- User trying to submit same maintenance twice

**Solution**: Search for contract again to see updated status

### **3. Missing Required Fields**

**Error**: "Mileage and total amount are required"

**Cause**: 
- User didn't fill required fields

**Solution**: Fill in mileage and total amount

### **4. Image Upload Failure**

**Behavior**: 
- If validation fails, uploaded image is deleted
- If maintenance not found, uploaded image is deleted

**Prevention**: Image cleanup prevents orphaned files

---

## 📝 Summary

**When "Confirm" button is clicked:**

1. ✅ Validates form data
2. ✅ Finds maintenance ID from search results
3. ✅ Prepares service data (services, mileage, amount, image)
4. ✅ Sends POST request to `/api/contracts/:maintId/submit-service`
5. ✅ Backend validates and checks maintenance record
6. ✅ Updates `tbl_AssetMaintenance` in **Standalone DB**
7. ✅ Sets `dateImplemented = NOW()` (marks as completed)
8. ✅ Saves service details (costs, mileage, image)
9. ✅ Returns success response
10. ✅ Frontend shows success alert and navigates back

**Result**: Maintenance record is marked as completed in Standalone DB, and status will show as "ALREADY_IMPLEMENTED" on next search.

