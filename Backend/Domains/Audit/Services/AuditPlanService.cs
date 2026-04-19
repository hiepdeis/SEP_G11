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
        private readonly IAuditNotificationService _notificationService;

        public AuditPlanService(
            MyDbContext db,
            IAuditNotificationService notificationService)
        {
            _db = db;
            _notificationService = notificationService;
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

        private static DateTime? ToUtc(DateTime? dt) => dt.HasValue ? DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc) : null;
        private static DateTime ToUtc(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc);

        private async Task ValidateBinsAreNotAssignedAsync(List<int> binIds, int? excludeStockTakeId, CancellationToken ct)
        {
            if (binIds == null || binIds.Count == 0) return;

            var conflicts = await _db.StockTakeBinLocations
                .AsNoTracking()
                .Include(x => x.StockTake)
                .Include(x => x.BinLocation)
                .Where(x => binIds.Contains(x.BinId) &&
                            x.StockTake.Status != "Completed" &&
                            (excludeStockTakeId == null || x.StockTakeId != excludeStockTakeId))
                .Select(x => new { x.BinLocation.Code, x.StockTake.Title })
                .ToListAsync(ct);

            if (conflicts.Any())
            {
                var firstConflict = conflicts.First();
                if (conflicts.Count == 1)
                {
                    throw new ArgumentException($"Bin {firstConflict.Code} đã thuộc trong đợt kiểm kê đang hoạt động '{firstConflict.Title}'.");
                }
                else
                {
                    var binCodes = string.Join(", ", conflicts.Select(c => c.Code).Distinct().Take(3));
                    if (conflicts.Select(c => c.Code).Distinct().Count() > 3) binCodes += "...";
                    throw new ArgumentException($"Các Bin ({binCodes}) đang thuộc các đợt kiểm kê chưa hoàn tất khác.");
                }
            }
        }

        public async Task<AuditPlanResponse> GetByIdAsync(int id, CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .Include(x => x.StockTakeBinLocations)
                .FirstOrDefaultAsync(x => x.StockTakeId == id, ct);

            if (st == null)
                throw new ArgumentException("Audit không tồn tại.");

            return new AuditPlanResponse
            {
                StockTakeId = st.StockTakeId,
                WarehouseId = st.WarehouseId,
                BinLocationIds = st.StockTakeBinLocations.Select(x => x.BinId).ToList(),
                Title = st.Title ?? "",
                PlannedStartDate = ToUtc(st.PlannedStartDate ?? DateTime.MinValue),
                PlannedEndDate = ToUtc(st.PlannedEndDate ?? DateTime.MinValue),
                Status = st.Status ?? "Planned",
                CreatedAt = ToUtc(st.CreatedAt),
                CreatedBy = st.CreatedBy,
                Notes = st.Notes
            };
        }

        public async Task<AuditPlanResponse> CreateAsync(CreateAuditPlanRequest request, int createdByUserId, CancellationToken ct)
        {
            // 1) Validate warehouse tồn tại
            var warehouse = await _db.Warehouses
                .AsNoTracking()
                .Where(x => x.WarehouseId == request.WarehouseId)
                .Select(x => new
                {
                    x.WarehouseId,
                    x.Name
                })
                .FirstOrDefaultAsync(ct);

            if (warehouse == null)
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

            // 2.1) Validate Bin chưa có trong audit active khác
            await ValidateBinsAreNotAssignedAsync(binLocationIds, null, ct);

            // 3) Validate date/time theo SRS
            var now = DateTime.UtcNow;

            if (request.PlannedStartDate < now.AddMinutes(-1)) // Allow a small buffer for network lag
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

            return new AuditPlanResponse
            {
                StockTakeId = entity.StockTakeId,
                WarehouseId = entity.WarehouseId,
                BinLocationIds = binLocationIds,
                Title = entity.Title ?? "",
                PlannedStartDate = ToUtc(entity.PlannedStartDate ?? request.PlannedStartDate),
                PlannedEndDate = ToUtc(entity.PlannedEndDate ?? request.PlannedEndDate),
                Status = entity.Status ?? "Planned",
                CreatedAt = ToUtc(entity.CreatedAt),
                CreatedBy = entity.CreatedBy,
                Notes = entity.Notes
            };
        }

        public async Task<AuditPlanResponse> UpdateAsync(int id, UpdateAuditPlanRequest request, CancellationToken ct)
        {
            var st = await _db.StockTakes
                .Include(x => x.StockTakeBinLocations)
                .FirstOrDefaultAsync(x => x.StockTakeId == id, ct);

            if (st == null)
                throw new ArgumentException("Audit không tồn tại.");

            await EnsureScopeCanBeEditedAsync(st, ct);

            // 1) Validate warehouse (nếu thay đổi warehouse, cần check kỹ hơn)
            if (st.WarehouseId != request.WarehouseId)
            {
                var warehouseExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId, ct);
                if (!warehouseExists)
                    throw new ArgumentException("WarehouseId mới không tồn tại.");
                
                st.WarehouseId = request.WarehouseId;
            }

            // 2) Validate bin locations
            var newBinIds = NormalizeBinLocationIds(request.BinLocationIds);
            if (newBinIds.Count > 0)
            {
                var invalidBins = new List<int>();
                foreach (var binId in newBinIds)
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

            // 2.1) Validate Bin chưa có trong audit active khác (trừ chính nó)
            await ValidateBinsAreNotAssignedAsync(newBinIds, id, ct);

            // 3) Validate date/time
            var now = DateTime.UtcNow;
            if (st.Status == "Planned" && request.PlannedStartDate < now.AddMinutes(-1))
                throw new ArgumentException("PlannedStartDate phải là thời điểm hiện tại hoặc tương lai.");

            if (request.PlannedEndDate <= request.PlannedStartDate)
                throw new ArgumentException("PlannedEndDate phải lớn hơn PlannedStartDate.");

            // 4) Update basic fields
            st.Title = request.Title;
            st.PlannedStartDate = request.PlannedStartDate;
            st.PlannedEndDate = request.PlannedEndDate;

            // 5) Update Bin Locations (Replace all)
            _db.StockTakeBinLocations.RemoveRange(st.StockTakeBinLocations);

            if (newBinIds.Any())
            {
                var newRecords = newBinIds.Select(binId => new StockTakeBinLocation
                {
                    StockTakeId = st.StockTakeId,
                    BinId = binId
                }).ToList();
                _db.StockTakeBinLocations.AddRange(newRecords);
            }

            await _notificationService.QueueAuditNotificationAsync(
                st.StockTakeId,
                $"Kế hoạch Audit #{st.StockTakeId} ({st.Title}) đã được cập nhật thông tin.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "WarehouseManager" },
                extraUserIds: null,
                excludeUserIds: null,
                ct);

            await _db.SaveChangesAsync(ct);

            return new AuditPlanResponse
            {
                StockTakeId = st.StockTakeId,
                WarehouseId = st.WarehouseId,
                BinLocationIds = newBinIds,
                Title = st.Title ?? "",
                PlannedStartDate = ToUtc(st.PlannedStartDate ?? request.PlannedStartDate),
                PlannedEndDate = ToUtc(st.PlannedEndDate ?? request.PlannedEndDate),
                Status = st.Status ?? "Planned",
                CreatedAt = ToUtc(st.CreatedAt),
                CreatedBy = st.CreatedBy,
                Notes = st.Notes
            };
        }

        public async Task DeleteAsync(int id, CancellationToken ct)
        {
            var st = await _db.StockTakes
                .Include(x => x.StockTakeBinLocations)
                .Include(x => x.StockTakeTeamMembers)
                .Include(x => x.StockTakeLocks)
                .FirstOrDefaultAsync(x => x.StockTakeId == id, ct);

            if (st == null)
                throw new ArgumentException("Audit không tồn tại.");

            if (!string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(st.Status, "Assigned", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Chỉ có thể xóa kế hoạch audit ở trạng thái Planned hoặc Assigned.");
            }

            // Nếu status là Assigned, có thể đã có team members, cần xóa sạch
            // Nếu có lock thì không cho xóa (EnsureScopeCanBeEditedAsync check lock)
            var hasActiveLocks = st.StockTakeLocks.Any(x => x.IsActive);
            if (hasActiveLocks)
                throw new ArgumentException("Audit đang bị khóa, không thể xóa.");

            _db.StockTakeBinLocations.RemoveRange(st.StockTakeBinLocations);
            _db.StockTakeTeamMembers.RemoveRange(st.StockTakeTeamMembers);
            _db.StockTakes.Remove(st);

            await _db.SaveChangesAsync(ct);
        }

        //public async Task DeleteBinLocationAsync(int stockTakeId, int binId, CancellationToken ct)
    }
}
