using Backend.Data;

using Backend.Domains.Audit.DTOs.Accountants;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class AuditPlanService : IAuditPlanService
    {
        private readonly MyDbContext _db;

        public AuditPlanService(MyDbContext db)
        {
            _db = db;
        }

        private static List<int> NormalizeBinLocationIds(IEnumerable<int>? binLocationIds)
        {
            return (binLocationIds ?? Enumerable.Empty<int>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();
        }

        private async Task EnsureScopeCanBeEditedAsync(StockTake stockTake, CancellationToken ct)
        {
            if (stockTake.CompletedAt != null ||
                string.Equals(stockTake.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Audit đã hoàn tất, không thể thay đổi phạm vi kiểm kê.");
            }

            var hasActiveLocks = await _db.StockTakeLocks
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTake.StockTakeId && x.IsActive, ct);

            if (hasActiveLocks)
                throw new ArgumentException("Audit đang bị khóa để kiểm kê, không thể thay đổi phạm vi BinLocation.");

            if (!string.Equals(stockTake.Status, "Planned", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(stockTake.Status, "Assigned", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Chỉ có thể thay đổi phạm vi BinLocation trước khi audit bắt đầu kiểm kê.");
            }
        }

        public async Task<AuditPlanResponse> CreateAsync(CreateAuditPlanRequest request, int createdByUserId, CancellationToken ct)
        {
            // 1) Validate warehouse tồn tại
            var whExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId, ct);
            if (!whExists)
                throw new ArgumentException("WarehouseId không tồn tại.");

            // 2) Nếu BinLocationIds được cung cấp, validate tất cả tồn tại và thuộc warehouse
            var binLocationIds = NormalizeBinLocationIds(request.BinLocationIds);

            if (binLocationIds.Count > 0)
            {
                var invalidBins = new List<int>();
                foreach (var binId in binLocationIds)
                {
                    var binExists = await _db.BinLocations.AnyAsync(
                        x => x.BinId == binId && x.WarehouseId == request.WarehouseId,
                        ct
                    );
                    if (!binExists)
                        invalidBins.Add(binId);
                }

                if (invalidBins.Any())
                    throw new ArgumentException($"Các BinLocationId không tồn tại hoặc không thuộc warehouse: {string.Join(", ", invalidBins)}");
            }

            // 3) Validate date/time theo SRS
            var now = DateTime.UtcNow;

            if (request.PlannedStartDate < now)
                throw new ArgumentException("PlannedStartDate phải là thời điểm hiện tại hoặc tương lai.");

            if (request.PlannedEndDate <= request.PlannedStartDate)
                throw new ArgumentException("PlannedEndDate phải lớn hơn PlannedStartDate.");

            // 4) Create record StockTakes: status = Planned
            var entity = new StockTake
            {
                WarehouseId = request.WarehouseId,
                CreatedBy = createdByUserId,
                Status = "Planned",
                Title = request.Title,
                PlannedStartDate = request.PlannedStartDate,
                PlannedEndDate = request.PlannedEndDate,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _db.StockTakes.Add(entity);
            await _db.SaveChangesAsync(ct);

            // 5) Nếu có BinLocationIds, tạo StockTakeBinLocation records
            if (binLocationIds.Any())
            {
                var stockTakeBinLocations = binLocationIds.Select(binId => new StockTakeBinLocation
                {
                    StockTakeId = entity.StockTakeId,
                    BinId = binId
                }).ToList();

                _db.StockTakeBinLocations.AddRange(stockTakeBinLocations);
                await _db.SaveChangesAsync(ct);
            }

            var inventoryQuery = _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == request.WarehouseId && x.QuantityOnHand > 0);

            if (binLocationIds.Any())
            {
                inventoryQuery = inventoryQuery.Where(x => binLocationIds.Contains(x.BinId));
            }

            var currentInventories = await inventoryQuery.ToListAsync(ct);

            if (currentInventories.Any())
            {
                var details = currentInventories.Select(item => new StockTakeDetail
                {
                    StockTakeId = entity.StockTakeId,
                    MaterialId = item.MaterialId,
                    BatchId = item.BatchId,
                    BinId = item.BinId,
                    SystemQty = item.QuantityOnHand, 
                    CountQty = null,                 
                    Variance = 0 - item.QuantityOnHand,
                    DiscrepancyStatus = "Pending",
                    CountRound = 1 
                }).ToList();

                _db.StockTakeDetails.AddRange(details);
                await _db.SaveChangesAsync(ct); 
            }

            // Accountant tạo plan mới => notify Manager
            var managerIds = await _db.Users.AsNoTracking()
                .Where(u => u.Role.RoleName == "Manager" && u.Status)
                .Select(u => u.UserId)
                .ToListAsync(ct);

            var notis = managerIds.Select(mgrId => new Notification
            {
                UserId = mgrId,
                Message = $"Kế toán vừa tạo kế hoạch kiểm kê mới: #{entity.StockTakeId} ({entity.Title}). Vui lòng phân công nhân sự.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }).ToList();
            
            _db.Notifications.AddRange(notis);
            await _db.SaveChangesAsync(ct);

            return new AuditPlanResponse
            {
                StockTakeId = entity.StockTakeId,
                WarehouseId = entity.WarehouseId,
                BinLocationIds = binLocationIds,
                Title = entity.Title ?? "",
                PlannedStartDate = entity.PlannedStartDate ?? request.PlannedStartDate,
                PlannedEndDate = entity.PlannedEndDate ?? request.PlannedEndDate,
                Status = entity.Status ?? "Planned",
                CreatedAt = entity.CreatedAt,
                CreatedBy = entity.CreatedBy,
                Notes = entity.Notes
            };
        }

        public async Task DeleteBinLocationAsync(int stockTakeId, int binId, CancellationToken ct)
        {
            // Validate StockTake tồn tại
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null)
                throw new ArgumentException("Audit không tồn tại.");

            await EnsureScopeCanBeEditedAsync(st, ct);

            // Xóa StockTakeBinLocation record
            var record = await _db.StockTakeBinLocations
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId && x.BinId == binId, ct);

            if (record == null)
                throw new ArgumentException("BinLocation này không được thêm vào audit.");

            var scopedBinCount = await _db.StockTakeBinLocations
                .AsNoTracking()
                .CountAsync(x => x.StockTakeId == stockTakeId, ct);

            if (scopedBinCount <= 1)
                throw new ArgumentException("Khong the xoa bin cuoi cung bang API nay. Neu muon chuyen sang kiem ke toan kho, hay dung API update bin-location voi danh sach rong.");

            _db.StockTakeBinLocations.Remove(record);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<AuditPlanResponse> UpdateBinLocationsAsync(int stockTakeId, UpdateBinLocationsRequest request, CancellationToken ct)
        {
            // Validate StockTake tồn tại
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null)
                throw new ArgumentException("Audit không tồn tại.");

            await EnsureScopeCanBeEditedAsync(st, ct);

            // Lấy danh sách bin mới
            var newBinIds = NormalizeBinLocationIds(request.BinLocationIds);

            // Validate tất cả bin mới tồn tại và thuộc warehouse
            if (newBinIds.Count > 0)
            {
                var invalidBins = new List<int>();
                foreach (var binId in newBinIds)
                {
                    var binExists = await _db.BinLocations.AnyAsync(
                        x => x.BinId == binId && x.WarehouseId == st.WarehouseId,
                        ct
                    );
                    if (!binExists)
                        invalidBins.Add(binId);
                }

                if (invalidBins.Any())
                    throw new ArgumentException($"Các BinLocationId không tồn tại hoặc không thuộc warehouse: {string.Join(", ", invalidBins)}");
            }

            // Xóa tất cả StockTakeBinLocation cũ
            var oldRecords = await _db.StockTakeBinLocations
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);

            if (oldRecords.Any())
                _db.StockTakeBinLocations.RemoveRange(oldRecords);

            // Thêm các bin mới
            if (newBinIds.Any())
            {
                var newRecords = newBinIds.Select(binId => new StockTakeBinLocation
                {
                    StockTakeId = stockTakeId,
                    BinId = binId
                }).ToList();

                _db.StockTakeBinLocations.AddRange(newRecords);
            }

            await _db.SaveChangesAsync(ct);

            // Return updated response
            return new AuditPlanResponse
            {
                StockTakeId = st.StockTakeId,
                WarehouseId = st.WarehouseId,
                BinLocationIds = newBinIds,
                Title = st.Title ?? "",
                PlannedStartDate = st.PlannedStartDate ?? DateTime.UtcNow,
                PlannedEndDate = st.PlannedEndDate ?? DateTime.UtcNow.AddDays(1),
                Status = st.Status ?? "Planned",
                CreatedAt = st.CreatedAt,
                CreatedBy = st.CreatedBy,
                Notes = st.Notes
            };
        }
    }
}
