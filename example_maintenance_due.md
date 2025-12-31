# Status Color Logic - How Colors Are Determined

## Overview

After searching for a contract, the app displays a **status banner** with different colors (Yellow, Red, Gray, Green) based on the maintenance status returned from the API.

---

## Color Mapping

The colors are determined by the `status` field in the API response:

| Status Value | Color | Meaning |
|-------------|-------|---------|
| `"NOT_YET_DUE"` | **Yellow** | Maintenance is not yet due |
| `"OVER_DUE"` | **Red** | Maintenance is overdue |
| `"ALREADY_IMPLEMENTED"` | **Gray** | Maintenance has already been completed |
| Any other value | **Green** | Default/active status (likely "DUE" or similar) |

---

## Code Location

### Status Component
**File**: `app/src/main/java/com/r2omm/maintenance/view/maintenancedata/components/Status.kt`

```kotlin
@Composable
fun Status(status: String, serverMessage: String) {
    val statusColor = remember {
        when (status) {
            "NOT_YET_DUE" -> Color.Yellow
            "OVER_DUE" -> Color.Red
            "ALREADY_IMPLEMENTED" -> Color.Gray
            else -> Color.Green
        }
    }
    Surface(modifier = Modifier.fillMaxWidth(), color = statusColor) {
        Text(text = serverMessage, modifier = Modifier.padding(8.dp))
    }
}
```

---

## API Response Structure

The `status` field comes from the API response:

**Endpoint**: `GET /api/contract/maint/get_by_code/{maintenance_code}/{maintenance_type}`

**Response**:
```json
{
  "data": {
    "maintId": 456,
    "maintDueDate": "2023-07-15",
    // ... other fields
  },
  "message": "Maintenance is overdue",
  "status": "OVER_DUE"  // ← This determines the color
}
```

---

## Status Calculation Logic (Backend)

The backend determines the status by comparing:
1. **Current Date** vs **Maintenance Due Date** (`maintDueDate`)
2. **Whether maintenance has been implemented** (checking `implemented_maintenance` array)

### Expected Logic:

```php
// Pseudo-code for backend status calculation
function calculateStatus($maintenance) {
    $today = date('Y-m-d');
    $dueDate = $maintenance->maintDueDate;
    
    // Check if already implemented
    if ($maintenance->isImplemented()) {
        return "ALREADY_IMPLEMENTED";  // Gray
    }
    
    // Compare dates
    if ($today < $dueDate) {
        return "NOT_YET_DUE";  // Yellow
    } elseif ($today > $dueDate) {
        return "OVER_DUE";  // Red
    } else {
        return "DUE";  // Green (or similar - this is the default case)
    }
}
```

---

## Status Values Breakdown

### 1. **"NOT_YET_DUE"** → Yellow
**Condition**: Current date < Maintenance due date

**Example**:
- Today: `2023-06-01`
- Due Date: `2023-07-15`
- Status: `"NOT_YET_DUE"` → **Yellow banner**

**Meaning**: Maintenance is scheduled but not yet due.

---

### 2. **"OVER_DUE"** → Red
**Condition**: Current date > Maintenance due date AND not implemented

**Example**:
- Today: `2023-08-01`
- Due Date: `2023-07-15`
- Status: `"OVER_DUE"` → **Red banner**

**Meaning**: Maintenance is past due and needs attention.

---

### 3. **"ALREADY_IMPLEMENTED"** → Gray
**Condition**: Maintenance has been completed (exists in `implemented_maintenance` array)

**Example**:
- Maintenance record exists
- Has entry in `implemented_maintenance` with `dateImplemented`
- Status: `"ALREADY_IMPLEMENTED"` → **Gray banner**

**Meaning**: Maintenance has already been performed.

---

### 4. **Default (Green)**
**Condition**: Any other status value (likely "DUE" or "ACTIVE")

**Example**:
- Today: `2023-07-15`
- Due Date: `2023-07-15`
- Status: `"DUE"` or `"ACTIVE"` → **Green banner**

**Meaning**: Maintenance is due today or in an active state.

**Note**: The FAB (Floating Action Button) is **enabled** only for Green status, allowing users to create a maintenance session.

---

## FAB (Floating Action Button) Logic

**File**: `app/src/main/java/com/r2omm/maintenance/view/maintenancedata/components/FAB.kt`

```kotlin
fun FAB(onClick: () -> Unit, status: String) {
    val isEnabled = remember {
        when (status) {
            "NOT_YET_DUE",
            "OVER_DUE",
            "ALREADY_IMPLEMENTED" -> false  // Disabled
            else -> true  // Enabled (Green status)
        }
    }
    // ... button implementation
}
```

**Behavior**:
- **Yellow, Red, Gray**: FAB is **disabled** (cannot create maintenance session)
- **Green**: FAB is **enabled** (can create maintenance session)

---

## Database Fields Needed for Status Calculation

To calculate status in your Laravel backend, you need:

### From `tbl_AssetMaintenance`:
- `MaintDueDate` or `maint_due_date` - The due date
- `AssetMaintenanceId` or `MaintId` - To check if implemented

### From `tbl_AssetMaintenance` (or separate sessions table):
- Check if there's an implemented maintenance record
- `DateImplemented` or `date_implemented` - When it was done
- `DtConfirmedImplemented` or `dt_confirmed_implemented` - Confirmation date

---

## Laravel Implementation

### Option 1: Calculate Status in Backend

```php
public function getByCode($maintenanceCode, $maintenanceType) {
    // ... get maintenance data
    
    $maintenance = AssetMaintenance::with(['sessions'])
        ->where(...)
        ->first();
    
    // Calculate status
    $status = $this->calculateStatus($maintenance);
    
    return response()->json([
        'data' => $this->formatMaintenanceData($maintenance),
        'message' => $this->getStatusMessage($status),
        'status' => $status  // ← This determines the color
    ]);
}

private function calculateStatus($maintenance) {
    $today = now()->format('Y-m-d');
    $dueDate = $maintenance->MaintDueDate;
    
    // Check if already implemented
    if ($maintenance->sessions()->exists()) {
        return 'ALREADY_IMPLEMENTED';
    }
    
    // Compare dates
    if ($today < $dueDate) {
        return 'NOT_YET_DUE';
    } elseif ($today > $dueDate) {
        return 'OVER_DUE';
    } else {
        return 'DUE';  // Green status
    }
}

private function getStatusMessage($status) {
    return match($status) {
        'NOT_YET_DUE' => 'Maintenance is not yet due',
        'OVER_DUE' => 'Maintenance is overdue',
        'ALREADY_IMPLEMENTED' => 'Maintenance has already been completed',
        default => 'Maintenance is due'
    };
}
```

### Option 2: Store Status in Database

If status is stored in the database:

```php
// In tbl_AssetMaintenance table
// Add column: Status VARCHAR(50)

// Then just return it:
return response()->json([
    'data' => $this->formatMaintenanceData($maintenance),
    'message' => $maintenance->StatusMessage,
    'status' => $maintenance->Status  // From database
]);
```

---

## Status Message

The `message` field in the API response is displayed as text in the colored banner:

```json
{
  "message": "Maintenance is overdue",  // ← Displayed text
  "status": "OVER_DUE"  // ← Determines color
}
```

**Common Messages**:
- `"Maintenance is not yet due"` (Yellow)
- `"Maintenance is overdue"` (Red)
- `"Maintenance has already been completed"` (Gray)
- `"Maintenance is due"` (Green)

---

## Visual Representation

```
┌─────────────────────────────────────┐
│  [Yellow Banner]                    │
│  "Maintenance is not yet due"      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  [Red Banner]                       │
│  "Maintenance is overdue"           │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  [Gray Banner]                      │
│  "Maintenance has already been      │
│   completed"                        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  [Green Banner]                     │
│  "Maintenance is due"               │
│  [Edit Button Enabled]              │
└─────────────────────────────────────┘
```

---

## Summary

✅ **Status comes from API response** - The `status` field in the JSON response

✅ **Colors are determined client-side** - Based on status value:
- `"NOT_YET_DUE"` → Yellow
- `"OVER_DUE"` → Red
- `"ALREADY_IMPLEMENTED"` → Gray
- Default → Green

✅ **Status is calculated by comparing**:
- Current date vs maintenance due date
- Whether maintenance has been implemented

✅ **FAB is enabled only for Green status** - Allows creating maintenance session

✅ **For your Laravel backend**: Calculate status based on date comparison and implementation check, then return it in the `status` field of the API response.

