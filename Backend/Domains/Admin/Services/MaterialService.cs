using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Domains.Admin.Support;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class MaterialService : IMaterialService
    {
        private readonly MyDbContext _db;

        public MaterialService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<PagedResult<MaterialListItemDto>> GetMaterialsAsync(GetMaterialsQuery query, CancellationToken ct)
        {
            var q =
                from m in _db.Materials.AsNoTracking()
                join c in _db.MaterialCategories.AsNoTracking()
                    on m.CategoryId equals c.CategoryId into mc
                from c in mc.DefaultIfEmpty()
                select new
                {
                    m.MaterialId,
                    m.Code,
                    m.Name,
                    m.Unit,
                    m.MassPerUnit,
                    m.MinStockLevel,
                    m.CategoryId,
                    CategoryName = c != null ? c.Name : null,
                    m.UnitPrice,
                    m.TechnicalStandard,
                    m.Specification
                };

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var keyword = query.Search.Trim().ToLower();
                q = q.Where(x => x.Code.ToLower().Contains(keyword) || x.Name.ToLower().Contains(keyword));
            }

            if (query.CategoryId.HasValue)
                q = q.Where(x => x.CategoryId == query.CategoryId.Value);

            var total = await q.CountAsync(ct);

            var items = await q
                .OrderBy(x => x.Code)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(ct);

            var materialIds = items.Select(x => x.MaterialId).ToList();

            var stockMap = await _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => materialIds.Contains(x.MaterialId))
                .GroupBy(x => x.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    TotalOnHand = g.Sum(x => x.QuantityOnHand),
                    TotalAllocated = g.Sum(x => x.QuantityAllocated)
                })
                .ToDictionaryAsync(x => x.MaterialId, ct);

            var result = items.Select(x =>
            {
                stockMap.TryGetValue(x.MaterialId, out var stock);

                return new MaterialListItemDto
                {
                    MaterialId = x.MaterialId,
                    Code = x.Code,
                    Name = x.Name,
                    Unit = x.Unit,
                    MassPerUnit = x.MassPerUnit,
                    MinStockLevel = x.MinStockLevel,
                    CategoryId = x.CategoryId,
                    CategoryName = x.CategoryName,
                    UnitPrice = x.UnitPrice,
                    TechnicalStandard = x.TechnicalStandard,
                    Specification = x.Specification,
                    TotalOnHand = stock?.TotalOnHand ?? 0,
                    TotalAllocated = stock?.TotalAllocated ?? 0
                };
            }).ToList();

            return new PagedResult<MaterialListItemDto>
            {
                Items = result,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = total
            };
        }

        public async Task<MaterialDetailDto?> GetByIdAsync(int materialId, CancellationToken ct)
        {
            var item = await (
                from m in _db.Materials.AsNoTracking()
                join c in _db.MaterialCategories.AsNoTracking()
                    on m.CategoryId equals c.CategoryId into mc
                from c in mc.DefaultIfEmpty()
                where m.MaterialId == materialId
                select new
                {
                    m.MaterialId,
                    m.Code,
                    m.Name,
                    m.Unit,
                    m.MassPerUnit,
                    m.MinStockLevel,
                    m.CategoryId,
                    CategoryName = c != null ? c.Name : null,
                    m.UnitPrice,
                    m.TechnicalStandard,
                    m.Specification
                }
            ).FirstOrDefaultAsync(ct);

            if (item == null) return null;

            var stock = await _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.MaterialId == materialId)
                .GroupBy(x => x.MaterialId)
                .Select(g => new
                {
                    TotalOnHand = g.Sum(x => x.QuantityOnHand),
                    TotalAllocated = g.Sum(x => x.QuantityAllocated)
                })
                .FirstOrDefaultAsync(ct);

            return new MaterialDetailDto
            {
                MaterialId = item.MaterialId,
                Code = item.Code,
                Name = item.Name,
                Unit = item.Unit,
                MassPerUnit = item.MassPerUnit,
                MinStockLevel = item.MinStockLevel,
                CategoryId = item.CategoryId,
                CategoryName = item.CategoryName,
                UnitPrice = item.UnitPrice,
                TechnicalStandard = item.TechnicalStandard,
                Specification = item.Specification,
                TotalOnHand = stock?.TotalOnHand ?? 0,
                TotalAllocated = stock?.TotalAllocated ?? 0,
                Available = (stock?.TotalOnHand ?? 0) - (stock?.TotalAllocated ?? 0)
            };
        }

        public async Task<int> CreateAsync(CreateMaterialRequest request, CancellationToken ct)
        {
            var normalizedUnit = await ValidateMaterialRequestAsync(
                request.Code,
                request.Name,
                request.Unit,
                request.MinStockLevel,
                request.CategoryId,
                ct,
                null);

            var entity = new Material
            {
                Code = request.Code.Trim().ToUpper(),
                Name = request.Name.Trim(),
                Unit = normalizedUnit,
                MassPerUnit = request.MassPerUnit,
                MinStockLevel = (int?)request.MinStockLevel,
                CategoryId = request.CategoryId,
                UnitPrice = request.UnitPrice,
                TechnicalStandard = request.TechnicalStandard?.Trim(),
                Specification = request.Specification?.Trim()
            };

            _db.Materials.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity.MaterialId;
        }

        public async Task<bool> UpdateAsync(int materialId, UpdateMaterialRequest request, CancellationToken ct)
        {
            var entity = await _db.Materials.FirstOrDefaultAsync(x => x.MaterialId == materialId, ct);
            if (entity == null) return false;

            var normalizedUnit = await ValidateMaterialRequestAsync(
                request.Code,
                request.Name,
                request.Unit,
                request.MinStockLevel,
                request.CategoryId,
                ct,
                materialId);

            entity.Code = request.Code.Trim().ToUpper();
            entity.Name = request.Name.Trim();
            entity.Unit = normalizedUnit;
            entity.MassPerUnit = request.MassPerUnit;
            entity.MinStockLevel = (int?)request.MinStockLevel;
            entity.CategoryId = request.CategoryId;
            entity.UnitPrice = request.UnitPrice;
            entity.TechnicalStandard = request.TechnicalStandard?.Trim();
            entity.Specification = request.Specification?.Trim();

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<(bool success, string message)> DeleteAsync(int materialId, CancellationToken ct)
        {
            var entity = await _db.Materials
                .FirstOrDefaultAsync(x => x.MaterialId == materialId, ct);

            if (entity == null)
                return (false, "Material not found.");

            var inventoryRows = await _db.InventoryCurrents
                .Where(x => x.MaterialId == materialId)
                .ToListAsync(ct);

            if (inventoryRows.Any(x => x.QuantityAllocated > 0))
                return (false, "Không thể xóa vật tư vì còn số lượng đang được cấp phát.");

            if (inventoryRows.Count > 0)
                _db.InventoryCurrents.RemoveRange(inventoryRows);

            var batches = await _db.Batches
                .Where(x => x.MaterialId == materialId)
                .ToListAsync(ct);

            if (batches.Count > 0)
                _db.Batches.RemoveRange(batches);

            _db.Materials.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return (true, "Xóa vật tư thành công.");
        }
        public async Task<List<MaterialInventoryByWarehouseDto>> GetInventoryByMaterialAsync(int materialId, CancellationToken ct)
        {
            var exists = await _db.Materials.AnyAsync(x => x.MaterialId == materialId, ct);
            if (!exists) return new List<MaterialInventoryByWarehouseDto>();

            var rows = await (
                from i in _db.InventoryCurrents.AsNoTracking()
                join w in _db.Warehouses.AsNoTracking() on i.WarehouseId equals w.WarehouseId
                join b in _db.BinLocations.AsNoTracking() on i.BinId equals b.BinId
                join ba in _db.Batches.AsNoTracking() on i.BatchId equals ba.BatchId
                where i.MaterialId == materialId
                orderby w.Name, b.Code, ba.BatchCode
                select new MaterialInventoryItemDto
                {
                    Id = (int)i.Id,
                    WarehouseId = (int)i.WarehouseId,
                    WarehouseName = w.Name,
                    BinId = i.BinId,
                    BinCode = b.Code,
                    BinType = b.Type,
                    BatchId = i.BatchId,
                    BatchCode = ba.BatchCode,
                    QuantityOnHand = i.QuantityOnHand ?? 0,
                    QuantityAllocated = i.QuantityAllocated ?? 0
                }
            ).ToListAsync(ct);

            return rows
                .GroupBy(x => new { x.WarehouseId, x.WarehouseName })
                .Select(g => new MaterialInventoryByWarehouseDto
                {
                    WarehouseId = g.Key.WarehouseId,
                    WarehouseName = g.Key.WarehouseName,
                    TotalOnHand = g.Sum(x => x.QuantityOnHand),
                    TotalAllocated = g.Sum(x => x.QuantityAllocated),
                    Rows = g.ToList()
                })
                .ToList();
        }

        public async Task<int> CreateInventoryAsync(int materialId, CreateMaterialInventoryRequest request, CancellationToken ct)
        {
            var resolvedBatchId = await ResolveBatchIdAsync(materialId, request.BatchId, request.BatchCode, ct);

            await ValidateInventoryRequestAsync(
                materialId,
                request.WarehouseId,
                request.BinId,
                resolvedBatchId,
                request.QuantityOnHand,
                request.QuantityAllocated,
                ct);

            var entity = new InventoryCurrent
            {
                MaterialId = materialId,
                WarehouseId = request.WarehouseId,
                BinId = request.BinId,
                BatchId = resolvedBatchId,
                QuantityOnHand = request.QuantityOnHand,
                QuantityAllocated = request.QuantityAllocated
            };

            _db.InventoryCurrents.Add(entity);
            await _db.SaveChangesAsync(ct);
            return (int)entity.Id;
        }

        public async Task<bool> UpdateInventoryAsync(int materialId, int inventoryId, UpdateMaterialInventoryRequest request, CancellationToken ct)
        {
            var entity = await _db.InventoryCurrents
                .FirstOrDefaultAsync(x => x.Id == inventoryId && x.MaterialId == materialId, ct);

            if (entity == null) return false;

            var resolvedBatchId = await ResolveBatchIdAsync(materialId, request.BatchId, request.BatchCode, ct);

            await ValidateInventoryRequestAsync(
                materialId,
                request.WarehouseId,
                request.BinId,
                resolvedBatchId,
                request.QuantityOnHand,
                request.QuantityAllocated,
                ct);

            entity.WarehouseId = request.WarehouseId;
            entity.BinId = request.BinId;
            entity.BatchId = resolvedBatchId;
            entity.QuantityOnHand = request.QuantityOnHand;
            entity.QuantityAllocated = request.QuantityAllocated;

            await _db.SaveChangesAsync(ct);
            return true;
        }
        public async Task<(bool success, string message)> DeleteInventoryAsync(int materialId, int inventoryId, CancellationToken ct)
        {
            var entity = await _db.InventoryCurrents
                .FirstOrDefaultAsync(x => x.Id == inventoryId && x.MaterialId == materialId, ct);

            if (entity == null)
                return (false, "Inventory row not found.");

            _db.InventoryCurrents.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return (true, "Xóa vị trí tồn kho thành công.");
        }

        private async Task<string> ValidateMaterialRequestAsync(
            string code,
            string name,
            string unit,
            decimal? minStockLevel,
            int? categoryId,
            CancellationToken ct,
            int? ignoreMaterialId)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Material code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Tên vật tư là bắt buộc.");

            if (!MaterialUnitCatalog.TryNormalize(unit, out var normalizedUnit))
                throw new ArgumentException("Đơn vị tính không hợp lệ. Vui lòng chọn đơn vị có sẵn.");

            if (minStockLevel.HasValue)
            {
                if (minStockLevel.Value < 0)
                    throw new ArgumentException("Tồn tối thiểu không được âm.");

                if (!IsWholeNumber(minStockLevel.Value))
                {
                    if (MaterialUnitCatalog.RequiresWholeQuantity(normalizedUnit))
                        throw new ArgumentException($"Đơn vị tính '{normalizedUnit}' chỉ chấp nhận tồn tối thiểu là số nguyên.");

                    throw new ArgumentException("Tồn tối thiểu hiện chỉ hỗ trợ số nguyên.");
                }
            }

            var normalizedCode = code.Trim().ToUpper();

            var duplicate = await _db.Materials
                .AnyAsync(x => x.Code == normalizedCode && (!ignoreMaterialId.HasValue || x.MaterialId != ignoreMaterialId.Value), ct);

            if (duplicate)
                throw new ArgumentException("Mã vật tư đã tồn tại.");

            if (categoryId.HasValue)
            {
                var categoryExists = await _db.MaterialCategories.AnyAsync(x => x.CategoryId == categoryId.Value, ct);
                if (!categoryExists)
                    throw new ArgumentException("CategoryId không tồn tại.");
            }

            return normalizedUnit;
        }

        private async Task ValidateInventoryRequestAsync(
     int materialId,
     int warehouseId,
     int binId,
     int batchId,
     decimal quantityOnHand,
     decimal quantityAllocated,
     CancellationToken ct)
        {
            var material = await _db.Materials
                .AsNoTracking()
                .Where(x => x.MaterialId == materialId)
                .Select(x => new
                {
                    x.MaterialId,
                    x.Unit
                })
                .FirstOrDefaultAsync(ct);

            if (material == null)
                throw new ArgumentException("Material không tồn tại.");

            if (!MaterialUnitCatalog.TryNormalize(material.Unit, out var normalizedUnit))
                throw new ArgumentException("Đơn vị tính của vật tư không hợp lệ.");

            var warehouseExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == warehouseId, ct);
            if (!warehouseExists)
                throw new ArgumentException("Warehouse không tồn tại.");

            var bin = await _db.BinLocations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BinId == binId, ct);

            if (bin == null)
                throw new ArgumentException("Bin không tồn tại.");

            if (bin.WarehouseId != warehouseId)
                throw new ArgumentException("Bin không thuộc warehouse đã chọn.");

            var batch = await _db.Batches
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BatchId == batchId, ct);

            if (batch == null)
                throw new ArgumentException("Batch không tồn tại.");

            if (batch.MaterialId != materialId)
                throw new ArgumentException("Batch không thuộc vật tư này.");

            if (quantityOnHand < 0)
                throw new ArgumentException("QuantityOnHand không được âm.");

            if (quantityAllocated < 0)
                throw new ArgumentException("QuantityAllocated không được âm.");

            if (MaterialUnitCatalog.RequiresWholeQuantity(normalizedUnit))
            {
                if (!IsWholeNumber(quantityOnHand))
                    throw new ArgumentException($"Đơn vị tính '{normalizedUnit}' chỉ chấp nhận tồn kho là số nguyên.");

                if (!IsWholeNumber(quantityAllocated))
                    throw new ArgumentException($"Đơn vị tính '{normalizedUnit}' chỉ chấp nhận số lượng phân bổ là số nguyên.");
            }

            if (quantityAllocated > quantityOnHand)
                throw new ArgumentException("Số lượng phân bổ không được vượt quá tồn kho.");
        }

        private static bool IsWholeNumber(decimal value)
        {
            return value == decimal.Truncate(value);
        }

        private async Task<int> ResolveBatchIdAsync(int materialId, int? batchId, string? batchCode, CancellationToken ct)
        {
            if (batchId.HasValue)
            {
                var batchById = await _db.Batches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.BatchId == batchId.Value, ct);

                if (batchById == null)
                    throw new ArgumentException("Batch không tồn tại.");

                if (batchById.MaterialId != materialId)
                    throw new ArgumentException("Batch không thuộc vật tư này.");

                return batchById.BatchId;
            }

            if (string.IsNullOrWhiteSpace(batchCode))
                throw new ArgumentException("BatchId hoặc BatchCode là bắt buộc.");

            var normalized = batchCode.Trim().ToUpper();

            var batchByCode = await _db.Batches
                .FirstOrDefaultAsync(x => x.MaterialId == materialId && x.BatchCode == normalized, ct);

            if (batchByCode != null)
                return batchByCode.BatchId;

            var newBatch = new Batch
            {
                MaterialId = materialId,
                BatchCode = normalized,
                CreatedDate = DateTime.UtcNow
            };

            _db.Batches.Add(newBatch);
            await _db.SaveChangesAsync(ct);

            return newBatch.BatchId;
        }
    }
}
