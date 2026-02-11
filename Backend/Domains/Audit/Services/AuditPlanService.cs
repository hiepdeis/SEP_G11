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

        public async Task<AuditPlanResponse> CreateAsync(CreateAuditPlanRequest request, int createdByUserId, CancellationToken ct)
        {
            // 1) Validate warehouse tồn tại
            var whExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId, ct);
            if (!whExists)
                throw new ArgumentException("WarehouseId không tồn tại.");

            // 2) Validate date theo SRS
            var today = DateTime.UtcNow.Date;
            if (request.PlannedStartDate.Date < today)
                throw new ArgumentException("PlannedStartDate phải là hôm nay hoặc tương lai.");
            if (request.PlannedEndDate.Date < request.PlannedStartDate.Date)
                throw new ArgumentException("PlannedEndDate phải >= PlannedStartDate.");

            // 3) Create record StockTakes: status = Planned (đúng SRS)
            // LƯU Ý: Tên entity/property có thể khác chút tùy bạn scaffold DB-first.
            var entity = new StockTake
            {
                WarehouseId = request.WarehouseId,
                CreatedBy = createdByUserId,
                Status = "Planned",
                Title = request.Title,
                PlannedStartDate = request.PlannedStartDate,
                PlannedEndDate = request.PlannedEndDate,
                Notes = request.Notes,
                // CreatedAt có default sysdatetime() ở DB; set cũng ok
                CreatedAt = DateTime.UtcNow
            };

            _db.StockTakes.Add(entity);
            await _db.SaveChangesAsync(ct);

            return new AuditPlanResponse
            {
                StockTakeId = entity.StockTakeId,
                WarehouseId = entity.WarehouseId,
                Title = entity.Title ?? "",
                PlannedStartDate = entity.PlannedStartDate ?? request.PlannedStartDate,
                PlannedEndDate = entity.PlannedEndDate ?? request.PlannedEndDate,
                Status = entity.Status ?? "Planned",
                CreatedAt = entity.CreatedAt,
                CreatedBy = entity.CreatedBy,
                Notes = entity.Notes
            };
        }
    }
}
