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
                PlannedStartDate = st.PlannedStartDate ?? DateTime.MinValue,
                PlannedEndDate = st.PlannedEndDate ?? DateTime.MinValue,
                Status = st.Status ?? "Planned",
                CreatedAt = st.CreatedAt,
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

            // 3) Validate date/time
            // Lưu ý: Có thể cho phép sửa PlannedStartDate nếu chưa bắt đầu, hoặc chỉ cho phép sửa nếu status là Planned
            // Ở đây theo yêu cầu chung: Planned hoặc Assigned
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
                roleNames: new[] { "Manager" },
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
                PlannedStartDate = st.PlannedStartDate ?? request.PlannedStartDate,
                PlannedEndDate = st.PlannedEndDate ?? request.PlannedEndDate,
                Status = st.Status ?? "Planned",
                CreatedAt = st.CreatedAt,
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
