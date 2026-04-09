using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Domains.Audit.Services;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests.Audit;

public sealed class StockTakeReviewServiceTests
{
    [Fact]
    public async Task SignOffAsync_ReturnsFailure_WhenActiveMembersAreStillPending()
    {
        using var db = CreateContext();
        var notifications = new FakeAuditNotificationService();
        var users = SeedUsers(db);
        var audit = SeedAudit(db, users.Manager.UserId, "InProgress");

        SeedInventory(db, audit.StockTakeId, audit.WarehouseId, audit.BinId, audit.MaterialId, audit.BatchId, 10m);
        SeedDetail(db, audit.StockTakeId, audit.MaterialId, audit.BinId, audit.BatchId, 10m, 10m);
        db.StockTakeTeamMembers.Add(new StockTakeTeamMember
        {
            Id = 1,
            StockTakeId = audit.StockTakeId,
            UserId = users.Staff.UserId,
            AssignedAt = DateTime.UtcNow.AddHours(-2),
            IsActive = true,
            MemberCompletedAt = null
        });

        await db.SaveChangesAsync();

        var service = new StockTakeReviewService(db, notifications);

        var (success, message, signature) = await service.SignOffAsync(
            audit.StockTakeId,
            users.Manager.UserId,
            new SignOffRequest(),
            CancellationToken.None);

        Assert.False(success);
        Assert.Equal("All active audit members must finish their work before sign-off.", message);
        Assert.Null(signature);
        Assert.Empty(db.StockTakeSignatures);
        Assert.Equal("InProgress", db.StockTakes.Single().Status);
        Assert.Empty(notifications.AuditNotifications);
    }

    [Fact]
    public async Task SignOffAsync_ReturnsFailure_WhenNotAllScopedItemsAreCounted()
    {
        using var db = CreateContext();
        var notifications = new FakeAuditNotificationService();
        var users = SeedUsers(db);
        var audit = SeedAudit(db, users.Manager.UserId, "InProgress");

        SeedInventory(db, audit.StockTakeId, audit.WarehouseId, audit.BinId, audit.MaterialId, audit.BatchId, 10m);
        SeedDetail(db, audit.StockTakeId, audit.MaterialId, audit.BinId, audit.BatchId, 10m, 10m);

        db.BinLocations.Add(new BinLocation
        {
            BinId = 101,
            WarehouseId = audit.WarehouseId,
            Code = "BIN-101",
            Warehouse = audit.Warehouse
        });
        db.InventoryCurrents.Add(new InventoryCurrent
        {
            Id = 2,
            WarehouseId = audit.WarehouseId,
            BinId = 101,
            MaterialId = audit.MaterialId,
            BatchId = audit.BatchId,
            QuantityOnHand = 5m,
            LastUpdated = DateTime.UtcNow,
            Warehouse = audit.Warehouse,
            Bin = db.BinLocations.Local.Single(x => x.BinId == 101),
            Material = audit.Material,
            Batch = audit.Batch
        });

        await db.SaveChangesAsync();

        var service = new StockTakeReviewService(db, notifications);

        var (success, message, signature) = await service.SignOffAsync(
            audit.StockTakeId,
            users.Manager.UserId,
            new SignOffRequest(),
            CancellationToken.None);

        Assert.False(success);
        Assert.Equal("All scoped inventory items must be counted before sign-off.", message);
        Assert.Null(signature);
        Assert.Empty(db.StockTakeSignatures);
        Assert.Equal("InProgress", db.StockTakes.Single().Status);
        Assert.Empty(notifications.AuditNotifications);
    }

    [Fact]
    public async Task SignOffAsync_ManagerSignOff_MovesAuditToReadyForReview_UnlocksLocks_AndNotifies()
    {
        using var db = CreateContext();
        var notifications = new FakeAuditNotificationService();
        var users = SeedUsers(db);
        var audit = SeedAudit(db, users.Manager.UserId, "InProgress");

        SeedInventory(db, audit.StockTakeId, audit.WarehouseId, audit.BinId, audit.MaterialId, audit.BatchId, 12m);
        SeedDetail(db, audit.StockTakeId, audit.MaterialId, audit.BinId, audit.BatchId, 12m, 12m);

        db.StockTakeLocks.Add(new StockTakeLock
        {
            LockId = 1,
            StockTakeId = audit.StockTakeId,
            ScopeType = "Warehouse",
            WarehouseId = audit.WarehouseId,
            IsActive = true,
            LockedAt = DateTime.UtcNow.AddHours(-1),
            LockedBy = users.Manager.UserId
        });

        await db.SaveChangesAsync();

        var service = new StockTakeReviewService(db, notifications);

        var (success, message, signature) = await service.SignOffAsync(
            audit.StockTakeId,
            users.Manager.UserId,
            new SignOffRequest { Notes = "  manager approved  " },
            CancellationToken.None);

        var updatedAudit = db.StockTakes.Single();
        var savedSignature = db.StockTakeSignatures.Single();
        var updatedLock = db.StockTakeLocks.Single();
        var accountantNotification = db.Notifications.Single();

        Assert.True(success);
        Assert.Equal("Signed off successfully", message);
        Assert.NotNull(signature);
        Assert.Equal("Manager", signature!.Role);
        Assert.Equal("manager approved", signature.Notes);

        Assert.Equal("ReadyForReview", updatedAudit.Status);
        Assert.Equal(users.Manager.UserId, savedSignature.UserId);
        Assert.Equal("Manager", savedSignature.Role);

        Assert.False(updatedLock.IsActive);
        Assert.Equal(users.Manager.UserId, updatedLock.UnlockedBy);
        Assert.NotNull(updatedLock.UnlockedAt);

        Assert.Equal(2, notifications.AuditNotifications.Count);
        Assert.All(notifications.AuditNotifications, call => Assert.Equal(audit.StockTakeId, call.StockTakeId));

        Assert.Equal(users.Accountant.UserId, accountantNotification.UserId);
        Assert.Contains($"#{audit.StockTakeId}", accountantNotification.Message);
    }

    [Fact]
    public async Task CompleteAuditAsync_ReturnsFailure_WhenUnresolvedVariancesRemain()
    {
        using var db = CreateContext();
        var notifications = new FakeAuditNotificationService();
        var users = SeedUsers(db);
        var audit = SeedAudit(db, users.Manager.UserId, "ReadyForReview");

        SeedInventory(db, audit.StockTakeId, audit.WarehouseId, audit.BinId, audit.MaterialId, audit.BatchId, 10m);
        SeedDetail(db, audit.StockTakeId, audit.MaterialId, audit.BinId, audit.BatchId, 10m, 8m, discrepancyStatus: "Discrepancy");
        SeedSignature(db, audit.StockTakeId, users.Manager.UserId, "Manager");
        SeedSignature(db, audit.StockTakeId, users.Accountant.UserId, "Accountant");

        await db.SaveChangesAsync();

        var service = new StockTakeReviewService(db, notifications);

        var (success, message) = await service.CompleteAuditAsync(
            audit.StockTakeId,
            users.Accountant.UserId,
            new CompleteAuditRequest(),
            CancellationToken.None);

        var updatedAudit = db.StockTakes.Single();

        Assert.False(success);
        Assert.Equal("1 variance(s) still need resolution.", message);
        Assert.Equal("ReadyForReview", updatedAudit.Status);
        Assert.Null(updatedAudit.CompletedAt);
        Assert.Empty(db.InventoryAdjustmentEntries);
    }

    [Fact]
    public async Task CompleteAuditAsync_PostsAdjustments_UnlocksLocks_AndCompletesAudit()
    {
        using var db = CreateContext();
        var notifications = new FakeAuditNotificationService();
        var users = SeedUsers(db);
        var audit = SeedAudit(db, users.Manager.UserId, "ReadyForReview");

        db.AdjustmentReasons.Add(new AdjustmentReason
        {
            ReasonId = 1,
            Code = "AUDIT",
            Name = "Audit Adjustment",
            IsActive = true
        });

        SeedInventory(db, audit.StockTakeId, audit.WarehouseId, audit.BinId, audit.MaterialId, audit.BatchId, 10m, inventoryId: 1);
        SeedDetail(
            db,
            audit.StockTakeId,
            audit.MaterialId,
            audit.BinId,
            audit.BatchId,
            systemQty: 10m,
            countQty: 7m,
            detailId: 1,
            discrepancyStatus: "Discrepancy",
            resolutionAction: "AdjustSystem",
            resolvedBy: users.Manager.UserId,
            resolvedAt: DateTime.UtcNow,
            adjustmentReasonId: 1);

        db.Batches.Add(new Batch
        {
            BatchId = 1001,
            MaterialId = audit.MaterialId,
            BatchCode = "BATCH-1001",
            Material = audit.Material
        });
        db.BinLocations.Add(new BinLocation
        {
            BinId = 101,
            WarehouseId = audit.WarehouseId,
            Code = "BIN-101",
            Warehouse = audit.Warehouse
        });
        db.InventoryCurrents.Add(new InventoryCurrent
        {
            Id = 2,
            WarehouseId = audit.WarehouseId,
            BinId = 101,
            MaterialId = audit.MaterialId,
            BatchId = 1001,
            QuantityOnHand = 20m,
            LastUpdated = DateTime.UtcNow,
            Warehouse = audit.Warehouse,
            Bin = db.BinLocations.Local.Single(x => x.BinId == 101),
            Material = audit.Material,
            Batch = db.Batches.Local.Single(x => x.BatchId == 1001)
        });
        SeedDetail(
            db,
            audit.StockTakeId,
            audit.MaterialId,
            101,
            1001,
            systemQty: 20m,
            countQty: 18m,
            detailId: 2,
            discrepancyStatus: "Discrepancy",
            resolutionAction: "AdjustSystem",
            resolvedBy: users.Manager.UserId,
            resolvedAt: DateTime.UtcNow,
            adjustmentReasonId: 1);
        db.InventoryAdjustmentEntries.Add(new InventoryAdjustmentEntry
        {
            EntryId = 10,
            StockTakeId = audit.StockTakeId,
            StockTakeDetailId = 2,
            WarehouseId = audit.WarehouseId,
            BinId = 101,
            MaterialId = audit.MaterialId,
            BatchId = 1001,
            QtyDelta = -2m,
            ReasonId = 1,
            Status = "Posted",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            CreatedBy = users.Manager.UserId,
            ApprovedAt = DateTime.UtcNow.AddMinutes(-10),
            ApprovedBy = users.Accountant.UserId,
            PostedAt = DateTime.UtcNow.AddMinutes(-10)
        });

        db.Batches.Add(new Batch
        {
            BatchId = 1002,
            MaterialId = audit.MaterialId,
            BatchCode = "BATCH-1002",
            Material = audit.Material
        });
        db.BinLocations.Add(new BinLocation
        {
            BinId = 102,
            WarehouseId = audit.WarehouseId,
            Code = "BIN-102",
            Warehouse = audit.Warehouse
        });
        db.InventoryCurrents.Add(new InventoryCurrent
        {
            Id = 3,
            WarehouseId = audit.WarehouseId,
            BinId = 102,
            MaterialId = audit.MaterialId,
            BatchId = 1002,
            QuantityOnHand = 30m,
            LastUpdated = DateTime.UtcNow,
            Warehouse = audit.Warehouse,
            Bin = db.BinLocations.Local.Single(x => x.BinId == 102),
            Material = audit.Material,
            Batch = db.Batches.Local.Single(x => x.BatchId == 1002)
        });
        SeedDetail(
            db,
            audit.StockTakeId,
            audit.MaterialId,
            102,
            1002,
            systemQty: 25m,
            countQty: 30m,
            detailId: 3,
            discrepancyStatus: "Discrepancy",
            resolutionAction: "AdjustSystem",
            resolvedBy: users.Manager.UserId,
            resolvedAt: DateTime.UtcNow,
            adjustmentReasonId: 1);

        SeedSignature(db, audit.StockTakeId, users.Manager.UserId, "Manager");
        SeedSignature(db, audit.StockTakeId, users.Accountant.UserId, "Accountant");
        db.StockTakeLocks.Add(new StockTakeLock
        {
            LockId = 1,
            StockTakeId = audit.StockTakeId,
            ScopeType = "Warehouse",
            WarehouseId = audit.WarehouseId,
            IsActive = true,
            LockedAt = DateTime.UtcNow.AddHours(-1),
            LockedBy = users.Manager.UserId
        });

        await db.SaveChangesAsync();

        var service = new StockTakeReviewService(db, notifications);

        var (success, message) = await service.CompleteAuditAsync(
            audit.StockTakeId,
            users.Accountant.UserId,
            new CompleteAuditRequest { Notes = "  final close  " },
            CancellationToken.None);

        var updatedAudit = db.StockTakes.Single();
        var updatedLock = db.StockTakeLocks.Single();
        var inventoryRows = db.InventoryCurrents.OrderBy(x => x.Id).ToList();
        var entries = db.InventoryAdjustmentEntries.OrderBy(x => x.EntryId).ToList();
        var newEntry = entries.Single(x => x.StockTakeDetailId == 1);

        Assert.True(success);
        Assert.Contains("Resolved variance candidates: 3", message);
        Assert.Contains("posted: 1", message);
        Assert.Contains("already posted: 1", message);
        Assert.Contains("zero-delta: 1", message);

        Assert.Equal("Completed", updatedAudit.Status);
        Assert.Equal(users.Accountant.UserId, updatedAudit.CompletedBy);
        Assert.Equal("final close", updatedAudit.Notes);
        Assert.NotNull(updatedAudit.CompletedAt);

        Assert.Equal(7m, inventoryRows[0].QuantityOnHand);
        Assert.Equal(20m, inventoryRows[1].QuantityOnHand);
        Assert.Equal(30m, inventoryRows[2].QuantityOnHand);

        Assert.Equal(2, entries.Count);
        Assert.Equal(-3m, newEntry.QtyDelta);
        Assert.Equal(users.Accountant.UserId, newEntry.ApprovedBy);
        Assert.Equal(users.Manager.UserId, newEntry.CreatedBy);
        Assert.Equal(1, newEntry.ReasonId);
        Assert.Equal("Posted", newEntry.Status);

        Assert.False(updatedLock.IsActive);
        Assert.Equal(users.Accountant.UserId, updatedLock.UnlockedBy);
        Assert.NotNull(updatedLock.UnlockedAt);
    }

    private static MyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new MyDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    private static SeededUsers SeedUsers(MyDbContext db)
    {
        var managerRole = new Role { RoleId = 1, RoleName = "Manager" };
        var accountantRole = new Role { RoleId = 2, RoleName = "Accountant" };
        var staffRole = new Role { RoleId = 3, RoleName = "Staff" };

        var manager = new User
        {
            UserId = 10,
            Username = "manager",
            PasswordHash = "hash",
            RoleId = managerRole.RoleId,
            Role = managerRole,
            FullName = "Manager User",
            Email = "manager@example.com",
            Status = true
        };

        var accountant = new User
        {
            UserId = 20,
            Username = "accountant",
            PasswordHash = "hash",
            RoleId = accountantRole.RoleId,
            Role = accountantRole,
            FullName = "Accountant User",
            Email = "accountant@example.com",
            Status = true
        };

        var staff = new User
        {
            UserId = 30,
            Username = "staff",
            PasswordHash = "hash",
            RoleId = staffRole.RoleId,
            Role = staffRole,
            FullName = "Staff User",
            Email = "staff@example.com",
            Status = true
        };

        db.Roles.AddRange(managerRole, accountantRole, staffRole);
        db.Users.AddRange(manager, accountant, staff);

        return new SeededUsers(manager, accountant, staff);
    }

    private static SeededAudit SeedAudit(MyDbContext db, int createdByUserId, string status)
    {
        var warehouse = new Warehouse
        {
            WarehouseId = 1,
            Name = "Main Warehouse"
        };
        var bin = new BinLocation
        {
            BinId = 100,
            WarehouseId = warehouse.WarehouseId,
            Code = "BIN-100",
            Warehouse = warehouse
        };
        var material = new Material
        {
            MaterialId = 1000,
            Code = "MAT-1000",
            Name = "Steel Bar",
            Unit = "pcs"
        };
        var batch = new Batch
        {
            BatchId = 1000,
            MaterialId = material.MaterialId,
            BatchCode = "BATCH-1000",
            Material = material
        };
        var stockTake = new StockTake
        {
            StockTakeId = 1,
            WarehouseId = warehouse.WarehouseId,
            CreatedBy = createdByUserId,
            Status = status,
            Title = "Quarterly Audit",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            Warehouse = warehouse
        };

        db.Warehouses.Add(warehouse);
        db.BinLocations.Add(bin);
        db.Materials.Add(material);
        db.Batches.Add(batch);
        db.StockTakes.Add(stockTake);

        return new SeededAudit(stockTake.StockTakeId, warehouse.WarehouseId, bin.BinId, material.MaterialId, batch.BatchId, warehouse, material, batch);
    }

    private static void SeedInventory(
        MyDbContext db,
        int stockTakeId,
        int warehouseId,
        int binId,
        int materialId,
        int batchId,
        decimal quantityOnHand,
        long inventoryId = 1)
    {
        var warehouse = db.Warehouses.Local.Single(x => x.WarehouseId == warehouseId);
        var bin = db.BinLocations.Local.Single(x => x.BinId == binId);
        var material = db.Materials.Local.Single(x => x.MaterialId == materialId);
        var batch = db.Batches.Local.Single(x => x.BatchId == batchId);

        db.InventoryCurrents.Add(new InventoryCurrent
        {
            Id = inventoryId,
            WarehouseId = warehouseId,
            BinId = binId,
            MaterialId = materialId,
            BatchId = batchId,
            QuantityOnHand = quantityOnHand,
            LastUpdated = DateTime.UtcNow,
            Warehouse = warehouse,
            Bin = bin,
            Material = material,
            Batch = batch
        });
    }

    private static void SeedDetail(
        MyDbContext db,
        int stockTakeId,
        int materialId,
        int binId,
        int batchId,
        decimal systemQty,
        decimal? countQty,
        long detailId = 1,
        string discrepancyStatus = "Matched",
        string? resolutionAction = null,
        int? resolvedBy = null,
        DateTime? resolvedAt = null,
        int? adjustmentReasonId = null)
    {
        db.StockTakeDetails.Add(new StockTakeDetail
        {
            Id = detailId,
            StockTakeId = stockTakeId,
            MaterialId = materialId,
            BinId = binId,
            BatchId = batchId,
            SystemQty = systemQty,
            CountQty = countQty,
            CountRound = 1,
            Variance = countQty.HasValue ? countQty.Value - systemQty : null,
            CountedBy = 30,
            CountedAt = DateTime.UtcNow.AddMinutes(-30),
            DiscrepancyStatus = discrepancyStatus,
            ResolutionAction = resolutionAction,
            ResolvedBy = resolvedBy,
            ResolvedAt = resolvedAt,
            AdjustmentReasonId = adjustmentReasonId
        });
    }

    private static void SeedSignature(MyDbContext db, int stockTakeId, int userId, string role)
    {
        db.StockTakeSignatures.Add(new StockTakeSignature
        {
            SignatureId = db.StockTakeSignatures.Local.Count + 1,
            StockTakeId = stockTakeId,
            UserId = userId,
            Role = role,
            SignedAt = DateTime.UtcNow.AddHours(-1),
            SignatureData = $"{role} sign-off"
        });
    }

    private sealed record SeededUsers(User Manager, User Accountant, User Staff);

    private sealed record SeededAudit(
        int StockTakeId,
        int WarehouseId,
        int BinId,
        int MaterialId,
        int BatchId,
        Warehouse Warehouse,
        Material Material,
        Batch Batch);

    private sealed class FakeAuditNotificationService : IAuditNotificationService
    {
        public List<AuditNotificationCall> AuditNotifications { get; } = new();

        public Task QueueNotificationAsync(
            IEnumerable<int> userIds,
            string message,
            string relatedEntityType,
            long? relatedEntityId,
            CancellationToken ct)
        {
            return Task.CompletedTask;
        }

        public Task QueueAuditNotificationAsync(
            int stockTakeId,
            string message,
            bool includeCreator,
            bool includeTeamMembers,
            IEnumerable<string>? roleNames,
            IEnumerable<int>? extraUserIds,
            IEnumerable<int>? excludeUserIds,
            CancellationToken ct)
        {
            AuditNotifications.Add(new AuditNotificationCall(
                stockTakeId,
                message,
                includeCreator,
                includeTeamMembers,
                roleNames?.ToArray() ?? Array.Empty<string>(),
                extraUserIds?.ToArray() ?? Array.Empty<int>(),
                excludeUserIds?.ToArray() ?? Array.Empty<int>()));

            return Task.CompletedTask;
        }
    }

    private sealed record AuditNotificationCall(
        int StockTakeId,
        string Message,
        bool IncludeCreator,
        bool IncludeTeamMembers,
        IReadOnlyList<string> RoleNames,
        IReadOnlyList<int> ExtraUserIds,
        IReadOnlyList<int> ExcludeUserIds);
}
