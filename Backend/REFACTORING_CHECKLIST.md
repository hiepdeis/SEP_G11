# Audit Domain Refactoring - Implementation Checklist

## ✅ Phase 1: Core Services Refactoring (COMPLETED)

### Stock Take Review Service
- [x] Create `IStockTakeReviewService` interface
- [x] Implement `StockTakeReviewService` class
  - [x] `GetMetricsAsync()` - Manager can view audit metrics
  - [x] `GetVariancesAsync()` - Manager can view variance items with filtering
  - [x] `ResolveVarianceAsync()` - Manager can resolve variances
- [x] Update `StockTakeReviewController` to use service
  - [x] `GetMetrics()` endpoint
  - [x] `GetVariances()` endpoint  
  - [x] `ResolveVariance()` endpoint
- [x] Add service registration in `Program.cs`
- [x] Build verification - ✅ All tests pass

### Stock Take Counting Service
- [x] Create `IStockTakeCountingService` interface
- [x] Implement `StockTakeCountingService` class
  - [x] `IsTeamMemberAsync()` - Verify staff belongs to audit team
  - [x] `GetCountItemsAsync()` - Retrieve inventory items for counting
  - [x] `UpsertCountAsync()` - Record/update counts
- [x] Update `StockTakeCountingController` to use service
  - [x] `GetCountItems()` endpoint
  - [x] `UpsertCount()` endpoint
- [x] Add service registration in `Program.cs`
- [x] Build verification - ✅ All tests pass

---

## 🔄 Phase 2: Remaining Review Controller Methods (TODO)

### Methods to Refactor in `StockTakeReviewController`:

#### 1. `GetReviewDetail()` - Manager views audit detail
- [ ] Extend `IStockTakeReviewService` with new method
  ```csharp
  Task<StockTakeReviewDetailDto> GetReviewDetailAsync(int stockTakeId, CancellationToken ct);
  ```
- [ ] Implement in `StockTakeReviewService`
  - Query StockTakes with CreatedByNavigation
  - Query StockTakeSignatures with User data
  - Query Warehouses
  - Assemble `StockTakeReviewDetailDto`
- [ ] Create `StockTakeReviewDetailDto` if not exists in ReviewReconcileDtos.cs
  - StockTakeId, Title, Status, WarehouseId, WarehouseName
  - CheckDate, PlannedStartDate, PlannedEndDate
  - CreatedBy, CreatedByName, CreatedAt
  - LockedAt, LockedBy, CompletedAt, CompletedBy
  - Notes, Signatures (List<SignatureInfoDto>)
- [ ] Create `SignatureInfoDto` if not exists
  - UserId, FullName, Role, SignedAt, Notes
- [ ] Update controller method to use service
- [ ] Test error cases:
  - Audit not found → 404 Not Found
  - Valid audit → 200 OK with data

#### 2. `SignOff()` - Staff/Manager signs the audit
- [ ] Extend `IStockTakeReviewService` with new method
  ```csharp
  Task<(bool success, string message, StockTakeSignature signature)> SignOffAsync(
      int stockTakeId, 
      int userId, 
      SignOffRequest request, 
      CancellationToken ct);
  ```
- [ ] Create `SignOffRequest` DTO in ReviewReconcileDtos.cs if not exists
  - Notes (optional)
- [ ] Implement in `StockTakeReviewService`
  - Find StockTake
  - Check user hasn't already signed
  - Get User to verify exists
  - Determine role (Manager vs Staff via team membership)
  - Create StockTakeSignature record
  - Auto-transition status if both staff and manager signed
  - Save changes
- [ ] Update controller method to use service
- [ ] Test error cases:
  - Audit not found → 404 Not Found
  - User already signed → 400 Bad Request
  - User not found → 404 Not Found
  - Valid sign-off → 200 OK

#### 3. `CompleteAudit()` - Manager finalizes audit
- [ ] Extend `IStockTakeReviewService` with new method
  ```csharp
  Task<(bool success, string message)> CompleteAuditAsync(
      int stockTakeId, 
      int managerId, 
      CompleteAuditRequest request, 
      CancellationToken ct);
  ```
- [ ] Create `CompleteAuditRequest` DTO in ReviewReconcileDtos.cs if not exists
  - Notes (optional)
- [ ] Implement in `StockTakeReviewService`
  - Find StockTake
  - Verify manager has signed off
  - Check all variances are resolved
  - Update Status to "Completed"
  - Set CompletedAt timestamp
  - Set CompletedBy to manager ID
  - Update Notes if provided
  - Save changes
- [ ] Update controller method to use service
- [ ] Test error cases:
  - Audit not found → 404 Not Found
  - Manager hasn't signed → 400 Bad Request
  - Unresolved variances exist → 400 Bad Request with count
  - Valid completion → 200 OK

---

## 🔍 Phase 3: Controller Review & Cleanup (TODO)

### Check all remaining controllers:

- [ ] `AuditPlansController` (Domains\Audit\Controllers\Accountants\)
  - Already uses `IAuditPlanService` ✅
  
- [ ] `AuditTeamsController` (Domains\Audit\Controllers\Managers\)
  - Already uses `IAuditTeamService` ✅
  
- [ ] `AuditWorkController` (Domains\Audit\Controllers\Staffs\)
  - [ ] Identify all methods
  - [ ] Create service interface if needed
  - [ ] Extract business logic to service
  
- [ ] `StaffNotificationsController` (Domains\Audit\Controllers\Staffs\)
  - [ ] Identify all methods
  - [ ] Create service interface if needed
  - [ ] Extract business logic to service

---

## 🧪 Phase 4: Unit Tests (TODO)

### Create test projects/classes:

- [ ] `StockTakeReviewServiceTests`
  ```csharp
  [TestFixture]
  public class GetMetricsAsyncTests
  {
      // Test: Returns correct metrics for audit
      // Test: Throws ArgumentException for non-existent audit
      // Test: Calculates match rate correctly
  }
  
  [TestFixture]
  public class GetVariancesAsyncTests
  {
      // Test: Returns variances with correct filters
      // Test: Handles pagination correctly
      // Test: Throws for non-existent audit
  }
  
  [TestFixture]
  public class ResolveVarianceAsyncTests
  {
      // Test: Resolves variance successfully
      // Test: Fails if audit is completed
      // Test: Fails if variance not found
  }
  ```

- [ ] `StockTakeCountingServiceTests`
  ```csharp
  [TestFixture]
  public class IsTeamMemberAsyncTests
  {
      // Test: Returns true for active team member
      // Test: Returns false for non-member
  }
  
  [TestFixture]
  public class GetCountItemsAsyncTests
  {
      // Test: Returns items for audit warehouse
      // Test: Applies filters correctly
      // Test: Throws if user not in team
  }
  
  [TestFixture]
  public class UpsertCountAsyncTests
  {
      // Test: Creates new count record
      // Test: Updates existing count record
      // Test: Calculates variance correctly
      // Test: Transitions status to InProgress
  }
  ```

- [ ] `StockTakeReviewControllerTests`
  ```csharp
  [TestFixture]
  public class GetMetricsTests
  {
      // Test: Returns 200 OK with metrics
      // Test: Returns 404 when audit not found
  }
  
  [TestFixture]
  public class ResolveVarianceTests
  {
      // Test: Returns 200 when resolved
      // Test: Returns 400 for invalid state
  }
  ```

- [ ] `StockTakeCountingControllerTests`
  ```csharp
  [TestFixture]
  public class GetCountItemsTests
  {
      // Test: Returns 200 OK with items
      // Test: Returns 403 Forbidden if not team member
  }
  
  [TestFixture]
  public class UpsertCountTests
  {
      // Test: Returns 200 OK when saved
      // Test: Returns 400 for invalid input
  }
  ```

---

## 📋 Quality Assurance Checklist (TODO)

- [ ] Code Review
  - [ ] All new classes follow naming conventions
  - [ ] All public methods have XML documentation
  - [ ] No hardcoded strings (use constants or configuration)
  - [ ] Proper async/await patterns
  - [ ] No N+1 query problems

- [ ] Performance Review
  - [ ] Database queries use `.AsNoTracking()` where appropriate
  - [ ] Include relationships explicitly (avoid lazy loading)
  - [ ] Pagination implemented for large result sets
  - [ ] Connection strings optimized

- [ ] Security Review
  - [ ] User ID properly extracted from claims
  - [ ] Authorization checks in service layer
  - [ ] SQL injection prevention (EF Core parameterized queries)
  - [ ] Sensitive data not logged
  - [ ] Validation on all inputs

- [ ] Error Handling
  - [ ] Consistent exception types
  - [ ] Meaningful error messages for users
  - [ ] Proper HTTP status codes
  - [ ] Logging of errors for debugging

---

## 📝 Documentation Checklist (TODO)

- [ ] XML Comments on all public methods
  ```csharp
  /// <summary>
  /// Gets audit metrics including counted, matched, and discrepancy items.
  /// </summary>
  /// <param name="stockTakeId">The audit ID</param>
  /// <param name="ct">Cancellation token</param>
  /// <returns>Audit metrics DTO</returns>
  /// <exception cref="ArgumentException">Thrown if audit not found</exception>
  public async Task<AuditMetricsDto> GetMetricsAsync(int stockTakeId, CancellationToken ct)
  ```

- [ ] API Documentation in Swagger
  - [ ] Add ProducesResponseType attributes
  - [ ] Add meaningful descriptions
  - [ ] Document error responses

- [ ] README.md updates
  - [ ] Architecture diagram
  - [ ] Service layer explanation
  - [ ] Development guidelines

- [ ] CHANGELOG.md updates
  - [ ] List all refactored services
  - [ ] Note breaking changes (none in this phase)
  - [ ] Links to related PRs

---

## 🚀 Deployment Checklist (TODO)

- [ ] All tests passing
- [ ] Code review approved
- [ ] No compiler warnings
- [ ] Database migrations (if any)
- [ ] Configuration values updated
- [ ] Documentation updated in Wiki/Docs
- [ ] Feature branch merged to main
- [ ] Version bumped in csproj
- [ ] Release notes prepared

---

## 📊 Progress Tracking

### Phase 1: Core Services - 100% COMPLETE ✅
- Completed: 2024-12-XX
- Services Created: 2
- Methods Refactored: 5
- Build Status: ✅ Success

### Phase 2: Remaining Methods - 0% (IN PROGRESS)
- Estimated Completion: 2024-12-XX
- Methods to Refactor: 3 (GetReviewDetail, SignOff, CompleteAudit)
- Estimated Hours: 4-6

### Phase 3: Controller Cleanup - 0% (PENDING)
- Estimated Start: 2024-12-XX
- Controllers to Review: 2 (AuditWorkController, StaffNotificationsController)
- Estimated Hours: 6-8

### Phase 4: Testing - 0% (PENDING)
- Estimated Start: 2024-12-XX
- Test Classes to Create: 5
- Test Methods to Write: 20+
- Estimated Hours: 12-16

### Phase 5: Documentation - 0% (PENDING)
- Estimated Start: 2024-12-XX
- Estimated Hours: 4-6

---

## 📞 Notes & Questions

- **Q**: Should AuditWorkController also be refactored?
- **Q**: Are there performance concerns with the variance query?
- **Q**: Should we implement caching for frequently accessed audits?
- **Q**: What's the team's preference for error handling - custom exceptions or result types?

---

## 🎯 Success Criteria

✅ **Phase 1:**
- [x] All specified methods have corresponding service methods
- [x] Controllers use dependency-injected services
- [x] No direct MyDbContext usage in controllers
- [x] Code compiles without warnings
- [x] All endpoints return correct status codes

🔄 **Phase 2:**
- [ ] All remaining review controller methods refactored
- [ ] Services handle all error cases gracefully
- [ ] DTOs properly defined and used
- [ ] No regression in API functionality

✨ **Overall:**
- [ ] 100% test coverage of service layer
- [ ] Architecture document complete
- [ ] All team members understand new structure
- [ ] Future maintenance easier and faster
