using AdminTest.TestHelpers;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Services;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace AdminTest.Services;

public class MaterialServiceTests
{
    [Test]
    public async Task CreateAsync_NormalizesAliasAndUppercasesCode()
    {
        using var db = TestDbContextFactory.Create();
        var service = new MaterialService(db);

        var materialId = await service.CreateAsync(
            new CreateMaterialRequest
            {
                Code = " mat-01 ",
                Name = " Xi mang ",
                Unit = "kilogram",
                MinStockLevel = 10
            },
            CancellationToken.None);

        var material = await db.Materials.SingleAsync(x => x.MaterialId == materialId);

        Assert.Multiple(() =>
        {
            Assert.That(material.Code, Is.EqualTo("MAT-01"));
            Assert.That(material.Name, Is.EqualTo("Xi mang"));
            Assert.That(material.Unit, Is.EqualTo("kg"));
            Assert.That(material.MinStockLevel, Is.EqualTo(10));
        });
    }

    [Test]
    public void CreateAsync_RejectsFractionalMinStockForWholeUnits()
    {
        using var db = TestDbContextFactory.Create();
        var service = new MaterialService(db);

        var ex = Assert.ThrowsAsync<ArgumentException>(async () =>
            await service.CreateAsync(
                new CreateMaterialRequest
                {
                    Code = "mat-02",
                    Name = "Bulb",
                    Unit = "cai",
                    MinStockLevel = 1.5m
                },
                CancellationToken.None));

        Assert.That(ex!.Message, Does.Contain("số nguyên"));
    }

    [Test]
    public async Task DeleteAsync_ReturnsFailureWhenAllocatedInventoryExists()
    {
        using var db = TestDbContextFactory.Create();
        var service = new MaterialService(db);

        SeedMaterialGraph(db);
        db.InventoryCurrents.Add(new InventoryCurrent
        {
            Id = 1,
            MaterialId = 1,
            WarehouseId = 1,
            BinId = 1,
            BatchId = 1,
            QuantityOnHand = 20,
            QuantityAllocated = 5
        });
        await db.SaveChangesAsync();

        var result = await service.DeleteAsync(1, CancellationToken.None);

        Assert.Multiple(async () =>
        {
            Assert.That(result.success, Is.False);
            Assert.That(result.message, Does.Contain("Không thể xóa vật tư"));
            Assert.That(await db.Materials.CountAsync(), Is.EqualTo(1));
            Assert.That(await db.InventoryCurrents.CountAsync(), Is.EqualTo(1));
        });
    }

    [Test]
    public async Task CreateInventoryAsync_CreatesBatchFromBatchCode()
    {
        using var db = TestDbContextFactory.Create();
        var service = new MaterialService(db);

        db.Materials.Add(new Material
        {
            MaterialId = 1,
            Code = "MAT-01",
            Name = "Steel",
            Unit = "kg"
        });
        db.Warehouses.Add(new Warehouse
        {
            WarehouseId = 1,
            Name = "Main Warehouse"
        });
        db.BinLocations.Add(new BinLocation
        {
            BinId = 1,
            WarehouseId = 1,
            Code = "A-01"
        });
        await db.SaveChangesAsync();

        var inventoryId = await service.CreateInventoryAsync(
            1,
            new CreateMaterialInventoryRequest
            {
                WarehouseId = 1,
                BinId = 1,
                BatchCode = " lot-01 ",
                QuantityOnHand = 12.5m,
                QuantityAllocated = 2.25m
            },
            CancellationToken.None);

        var batch = await db.Batches.SingleAsync();
        var inventory = await db.InventoryCurrents.SingleAsync(x => x.Id == inventoryId);

        Assert.Multiple(() =>
        {
            Assert.That(batch.BatchCode, Is.EqualTo("LOT-01"));
            Assert.That(batch.MaterialId, Is.EqualTo(1));
            Assert.That(inventory.BatchId, Is.EqualTo(batch.BatchId));
            Assert.That(inventory.QuantityOnHand, Is.EqualTo(12.5m));
            Assert.That(inventory.QuantityAllocated, Is.EqualTo(2.25m));
        });
    }

    private static void SeedMaterialGraph(Backend.Data.MyDbContext db)
    {
        db.Materials.Add(new Material
        {
            MaterialId = 1,
            Code = "MAT-01",
            Name = "Steel",
            Unit = "kg"
        });
        db.Warehouses.Add(new Warehouse
        {
            WarehouseId = 1,
            Name = "Main Warehouse"
        });
        db.BinLocations.Add(new BinLocation
        {
            BinId = 1,
            WarehouseId = 1,
            Code = "A-01"
        });
        db.Batches.Add(new Batch
        {
            BatchId = 1,
            MaterialId = 1,
            BatchCode = "BATCH-01",
            CreatedDate = DateTime.UtcNow
        });
    }
}
