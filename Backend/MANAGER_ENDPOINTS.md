# Stock Take Review/Reconcile Manager Endpoints

## Overview
The Manager Review/Reconcile endpoints allow warehouse managers to review counting results, resolve variances, and complete the audit process. There are 4 main phases:

1. **View Metrics** - Overview of counting progress
2. **Resolve Variances** - Manager handles discrepancies
3. **Sign Off** - Staff and Manager approval
4. **Complete** - Final audit completion

---

## Endpoints

### 1. GET /api/manager/audits/{stockTakeId}/metrics
**Purpose:** View audit metrics and progress overview

**Query Parameters:**
- `stockTakeId` (int, required) - The audit ID

**Response:**
```json
{
  "stockTakeId": 1,
  "title": "Monthly Inventory Check",
  "status": "InProgress",
  "totalItems": 500,
  "countedItems": 450,
  "uncountedItems": 50,
  "matchedItems": 435,
  "discrepancyItems": 15,
  "matchRate": 96.67
}
```

**Status Codes:**
- `200 OK` - Metrics retrieved successfully
- `404 Not Found` - Audit not found

---

### 2. GET /api/manager/audits/{stockTakeId}/variances
**Purpose:** Get list of variance items (discrepancies) for review

**Query Parameters:**
- `stockTakeId` (int, required) - The audit ID
- `skip` (int, optional, default=0) - Pagination skip
- `take` (int, optional, default=50, max=200) - Pagination take

**Response:**
```json
{
  "total": 15,
  "items": [
    {
      "id": 1,
      "materialId": 10,
      "materialName": "Material A",
      "binId": 5,
      "binCode": "A1-01",
      "batchId": 20,
      "batchCode": "BATCH-001",
      "systemQty": 100,
      "countQty": 95,
      "variance": -5,
      "discrepancyStatus": "Discrepancy",
      "countedBy": 4,
      "countedByName": "John Staff",
      "countedAt": "2024-01-15T10:30:00Z",
      "reason": "Possible damage",
      "resolutionAction": null,
      "adjustmentReasonId": null,
      "adjustmentReasonName": null,
      "resolvedBy": null,
      "resolvedByName": null,
      "resolvedAt": null
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Variances retrieved successfully
- `404 Not Found` - Audit not found

---

### 3. PUT /api/manager/audits/{stockTakeId}/variances/{detailId}/resolve
**Purpose:** Manager resolves a variance by setting resolution action and adjustment reason

**Path Parameters:**
- `stockTakeId` (int, required) - The audit ID
- `detailId` (long, required) - The StockTakeDetail ID

**Request Body:**
```json
{
  "resolutionAction": "AdjustSystem",
  "adjustmentReasonId": 5,
  "notes": "Adjusted based on physical count confirmation"
}
```

**Response:**
```json
{
  "message": "Variance resolved",
  "detailId": 1,
  "resolutionAction": "AdjustSystem",
  "resolvedAt": "2024-01-15T11:45:00Z"
}
```

**Status Codes:**
- `200 OK` - Variance resolved successfully
- `400 Bad Request` - Invalid request or audit in wrong state
- `404 Not Found` - Variance detail or audit not found

**Resolution Actions:** 
- "Accept" - Accept the variance as-is
- "AdjustSystem" - Adjust system inventory to match count
- "Investigate" - Mark for further investigation
- (Other custom actions as needed)

---

### 4. GET /api/manager/audits/{stockTakeId}/review-detail
**Purpose:** Get full audit review details including team members and signatures

**Query Parameters:**
- `stockTakeId` (int, required) - The audit ID

**Response:**
```json
{
  "stockTakeId": 1,
  "title": "Monthly Inventory Check",
  "status": "InProgress",
  "warehouseId": 2,
  "warehouseName": "Warehouse A",
  "checkDate": "2024-01-15T00:00:00Z",
  "plannedStartDate": "2024-01-15T00:00:00Z",
  "plannedEndDate": "2024-01-20T00:00:00Z",
  "createdBy": 1,
  "createdByName": "Manager User",
  "createdAt": "2024-01-15T08:00:00Z",
  "lockedAt": null,
  "lockedBy": null,
  "completedAt": null,
  "completedBy": null,
  "notes": null,
  "signatures": [
    {
      "userId": 4,
      "fullName": "John Staff",
      "role": "Staff",
      "signedAt": "2024-01-15T16:00:00Z",
      "notes": "Completed counting"
    },
    {
      "userId": 1,
      "fullName": "Manager User",
      "role": "Manager",
      "signedAt": "2024-01-16T09:00:00Z",
      "notes": "Reviewed and approved"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Audit details retrieved successfully
- `404 Not Found` - Audit not found

---

### 5. POST /api/manager/audits/{stockTakeId}/sign-off
**Purpose:** Manager or Staff signs off on the audit review

**Path Parameters:**
- `stockTakeId` (int, required) - The audit ID

**Request Body:**
```json
{
  "notes": "Reviewed and approved all items"
}
```

**Response:**
```json
{
  "message": "Signed off successfully",
  "role": "Manager",
  "signedAt": "2024-01-16T09:00:00Z"
}
```

**Status Codes:**
- `200 OK` - Signed off successfully
- `400 Bad Request` - User already signed or invalid state
- `404 Not Found` - Audit or user not found

**Behavior:**
- Creates a StockTakeSignature record
- User role determined by team membership (Staff if in team, Manager otherwise)
- When both Staff and Manager have signed, audit status changes to "ReadyForReview"

---

### 6. POST /api/manager/audits/{stockTakeId}/complete
**Purpose:** Manager completes the audit (final action)

**Path Parameters:**
- `stockTakeId` (int, required) - The audit ID

**Request Body:**
```json
{
  "notes": "All items verified and resolved"
}
```

**Response:**
```json
{
  "message": "Audit completed",
  "completedAt": "2024-01-16T10:00:00Z",
  "completedBy": 1
}
```

**Status Codes:**
- `200 OK` - Audit completed successfully
- `400 Bad Request` - Manager not signed off or unresolved variances exist
- `404 Not Found` - Audit not found

**Prerequisites:**
- Manager must have signed off on the audit
- All variances must have a ResolutionAction set
- Audit status must allow completion

---

## Typical Workflow

```
1. GET /api/manager/audits/{stockTakeId}/metrics
   └─ Check progress and statistics

2. GET /api/manager/audits/{stockTakeId}/variances?skip=0&take=50
   └─ Review discrepancies

3. PUT /api/manager/audits/{stockTakeId}/variances/{detailId}/resolve
   └─ Resolve each variance (repeat for all)

4. GET /api/manager/audits/{stockTakeId}/review-detail
   └─ View complete audit information

5. POST /api/manager/audits/{stockTakeId}/sign-off
   └─ Manager signs off

6. POST /api/manager/audits/{stockTakeId}/complete
   └─ Finalize audit
```

---

## Authentication
- Routes require `[Authorize(Roles = "Warehouse Manager")]` (currently commented out for testing)
- User ID extracted from JWT claims or dev fallback (returns 1 in development)

## Error Handling
All endpoints return appropriate HTTP status codes:
- `200 OK` - Successful operation
- `400 Bad Request` - Invalid request or business logic violation
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
