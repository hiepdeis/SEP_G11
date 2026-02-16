# Audit Domain - Architecture Overview

## Directory Structure (After Refactoring)

```
Domains/Audit/
├── Controllers/
│   ├── Accountants/
│   │   └── AuditPlansController.cs          [✓ Uses IAuditPlanService]
│   ├── Managers/
│   │   ├── AuditTeamsController.cs          [✓ Uses IAuditTeamService]
│   │   └── StockTakeReviewController.cs     [✓ Uses IStockTakeReviewService]
│   └── Staffs/
│       ├── AuditWorkController.cs           [To be refactored]
│       ├── StaffNotificationsController.cs  [To be refactored]
│       └── StockTakeCountingController.cs   [✓ Uses IStockTakeCountingService]
│
├── Interfaces/
│   ├── IAuditPlanService.cs                 [✓ Implemented]
│   ├── IAuditTeamService.cs                 [✓ Implemented]
│   ├── IStockTakeReviewService.cs           [✓ NEW - Implemented]
│   └── IStockTakeCountingService.cs         [✓ NEW - Implemented]
│
├── Services/
│   ├── AuditPlanService.cs                  [✓ Implemented]
│   ├── AuditTeamService.cs                  [✓ Implemented]
│   ├── StockTakeReviewService.cs            [✓ NEW - Implemented]
│   └── StockTakeCountingService.cs          [✓ NEW - Implemented]
│
└── DTOs/
    ├── Accountants/
    │   ├── CreateAuditPlanRequest.cs        [✓ Used by AuditPlansController]
    │   └── AuditPlanResponse.cs             [✓ Used by AuditPlansController]
    │
    ├── Managers/
    │   ├── AuditTeamDtos.cs                 [✓ Used by AuditTeamsController]
    │   └── ReviewReconcileDtos.cs           [✓ Used by StockTakeReviewController]
    │       - AuditMetricsDto
    │       - VarianceItemDto
    │       - ResolveVarianceRequest
    │
    └── Staffs/
        ├── CountingDtos.cs
        │   - CountItemDto
        │   - UpsertCountRequest
        │
        └── CountItemStaffDto.cs
```

## Service Dependencies Graph

```
AuditPlansController
    └── IAuditPlanService
        └── MyDbContext
            ├── StockTakes
            ├── Warehouses
            └── ...

AuditTeamsController
    └── IAuditTeamService
        └── MyDbContext
            ├── StockTakes
            ├── StockTakeTeamMembers
            ├── Users
            └── ...

StockTakeReviewController (REFACTORED)
    └── IStockTakeReviewService
        └── MyDbContext
            ├── StockTakes
            ├── StockTakeDetails
            ├── InventoryCurrents
            ├── Materials
            ├── Users
            └── ...

StockTakeCountingController (REFACTORED)
    └── IStockTakeCountingService
        └── MyDbContext
            ├── StockTakes
            ├── StockTakeTeamMembers
            ├── StockTakeDetails
            ├── InventoryCurrents
            ├── Batches
            ├── BinLocations
            └── ...
```

## Request-Response Flow

### Example 1: Get Audit Metrics (Manager)
```
1. Manager calls: GET /api/manager/audits/123/metrics
                    ↓
2. StockTakeReviewController.GetMetrics(123)
                    ↓
3. Calls: _service.GetMetricsAsync(123, ct)
                    ↓
4. StockTakeReviewService.GetMetricsAsync(123, ct)
   - Queries StockTakes
   - Queries InventoryCurrents
   - Queries StockTakeDetails (counted items)
   - Queries StockTakeDetails (matched items)
   - Calculates metrics
                    ↓
5. Returns: AuditMetricsDto
                    ↓
6. StockTakeReviewController returns: HTTP 200 + JSON
```

### Example 2: Get Variance Items (Manager)
```
1. Manager calls: GET /api/manager/audits/123/variances?skip=0&take=50&resolved=false
                    ↓
2. StockTakeReviewController.GetVariances(123, 0, 50, false, ct)
                    ↓
3. Calls: _service.GetVariancesAsync(123, 0, 50, false, ct)
                    ↓
4. StockTakeReviewService.GetVariancesAsync(...)
   - Validates audit exists
   - Queries StockTakeDetails with discrepancies
   - Filters by resolution status
   - Includes related data (Material, Bin, Batch, Users)
   - Paginates results
   - Selects to VarianceItemDto
                    ↓
5. Returns: (List<VarianceItemDto>, totalCount, unresolvedCount)
                    ↓
6. StockTakeReviewController returns: HTTP 200 + JSON
```

### Example 3: Staff Records Count (Staff)
```
1. Staff calls: PUT /api/staff/audits/123/count-items
                { materialId: 5, binCode: "A1", batchCode: "B001", countQty: 100 }
                    ↓
2. StockTakeCountingController.UpsertCount(123, request, ct)
                    ↓
3. Calls: _service.UpsertCountAsync(123, userId, request, ct)
                    ↓
4. StockTakeCountingService.UpsertCountAsync(...)
   - Checks team membership
   - Validates CountQty >= 0
   - Resolves BatchId from BatchCode
   - Resolves BinId from BinCode
   - Finds InventoryCurrent
   - Calculates variance
   - Creates/Updates StockTakeDetail
   - Saves to database
                    ↓
5. Returns: (success: true, message: "Saved")
                    ↓
6. StockTakeCountingController returns: HTTP 200 + JSON (without variance details)
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     HTTP Request                              │
│            (Manager/Staff/Accountant Action)                  │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
            ┌─────────────────────────┐
            │  ASP.NET Core Routing   │
            │  Model Binding          │
            │  Request Validation     │
            └────────────┬────────────┘
                         ↓
        ┌────────────────────────────────┐
        │      Controller Layer           │
        │  ┌──────────────────────────┐   │
        │  │ Extract HTTP context     │   │
        │  │ Get userId/claims        │   │
        │  │ Validate user identity   │   │
        │  │ Map request to DTO       │   │
        │  │ Delegate to service      │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
        ┌────────────────────────────────┐
        │      Service Layer              │
        │  ┌──────────────────────────┐   │
        │  │ Business Logic           │   │
        │  │ • Validation             │   │
        │  │ • Authorization          │   │
        │  │ • Domain Rules           │   │
        │  │ • Orchestration          │   │
        │  │ • Error Handling         │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
        ┌────────────────────────────────┐
        │      Data Access Layer          │
        │  ┌──────────────────────────┐   │
        │  │ Entity Framework         │   │
        │  │ LINQ Queries             │   │
        │  │ Change Tracking          │   │
        │  │ SaveChanges()            │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
           ┌──────────────────────┐
           │    SQL Database      │
           │  • StockTakes        │
           │  • StockTakeDetails  │
           │  • Users             │
           │  • Materials         │
           │  • ... etc           │
           └──────────┬───────────┘
                      ↓
           ┌──────────────────────┐
           │   Database Returns   │
           │   Entity Data        │
           └──────────┬───────────┘
                      ↓
        ┌────────────────────────────────┐
        │      Service Layer              │
        │  ┌──────────────────────────┐   │
        │  │ Map Entities to DTOs     │   │
        │  │ Apply Formatting         │   │
        │  │ Handle Errors            │   │
        │  │ Return Result            │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
        ┌────────────────────────────────┐
        │      Controller Layer           │
        │  ┌──────────────────────────┐   │
        │  │ Check Service Result     │   │
        │  │ Create HTTP Response     │   │
        │  │ Set Status Code          │   │
        │  │ Return JSON/Content      │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────────┐
│                     HTTP Response                             │
│            (JSON Data or Error Message)                       │
└──────────────────────────────────────────────────────────────┘
```

## Authorization & Security Flow

```
┌─────────────────────────────────────────────────┐
│         HTTP Request with JWT Token             │
│  Header: Authorization: Bearer {token}          │
└────────────────────┬────────────────────────────┘
                     ↓
            ┌─────────────────────────┐
            │ JWT Authentication      │
            │ Extract Claims from JWT │
            │ Set User.Principal      │
            └────────────┬────────────┘
                         ↓
        ┌────────────────────────────────┐
        │      Controller Layer           │
        │  ┌──────────────────────────┐   │
        │  │ GetUserId() helper       │   │
        │  │ • Extract ClaimTypes     │   │
        │  │ • Fallback for dev       │   │
        │  │ • Validate user exists   │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
        ┌────────────────────────────────┐
        │      Service Layer              │
        │  ┌──────────────────────────┐   │
        │  │ Authorization Checks     │   │
        │  │ • IsTeamMember()         │   │
        │  │ • Verify permissions     │   │
        │  │ • Check resource access  │   │
        │  └──────────┬───────────────┘   │
        └─────────────┼───────────────────┘
                      ↓
           ┌──────────────────────┐
           │   Access Granted?    │
           └──────┬───────┬───────┘
              Yes │       │ No
                  ↓       ↓
            ┌──────┐   ┌──────────────┐
            │ OK   │   │ Forbidden or │
            │ 200  │   │ Unauthorized │
            │      │   │ 401/403      │
            └──────┘   └──────────────┘
```

## Refactoring Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Code Organization** | Mixed concerns | Separated layers |
| **Testability** | Hard to test | Easily mockable interfaces |
| **Reusability** | Logic tied to controllers | Reusable services |
| **Maintainability** | Changes ripple | Localized changes |
| **Error Handling** | Inconsistent | Standardized via services |
| **Business Logic** | In controllers | In services |
| **Dependencies** | Direct DB context | Injected interfaces |
| **Scaling** | Difficult | Clear patterns |

---

**Status:** ✅ First Phase Complete (GetMetrics, GetVariances, ResolveVariance, GetCountItems, UpsertCount)

**Next Phase:** Refactor remaining StockTakeReviewController methods (GetReviewDetail, SignOff, CompleteAudit)
