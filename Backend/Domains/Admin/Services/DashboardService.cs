using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class DashboardService : IDashboardService
    {
        private readonly MyDbContext _db;

        public DashboardService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardResponseDto> GetDashboardAsync(CancellationToken ct)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var totalMaterials = await _db.Materials
                .AsNoTracking()
                .CountAsync(ct);
            var inventoryRows = await (
                from ic in _db.InventoryCurrents.AsNoTracking()
                join m in _db.Materials.AsNoTracking() on ic.MaterialId equals m.MaterialId
                join w in _db.Warehouses.AsNoTracking() on ic.WarehouseId equals (int?)w.WarehouseId
                where m.MinStockLevel != null
                select new
                {
                    m.MaterialId,
                    MaterialCode = m.Code,
                    MaterialName = m.Name,
                    m.Unit,
                    MinStockLevel = m.MinStockLevel ?? 0,
                    WarehouseName = w.Name,
                    QuantityOnHand = ic.QuantityOnHand ?? 0
                }
            ).ToListAsync(ct);

            var filteredLowStock = inventoryRows
                .GroupBy(x => new
                {
                    x.MaterialId,
                    x.MaterialCode,
                    x.MaterialName,
                    x.Unit,
                    x.MinStockLevel,
                    x.WarehouseName
                })
                .Select(g => new LowStockMaterialDto
                {
                    MaterialId = g.Key.MaterialId,
                    Code = g.Key.MaterialCode,
                    Name = g.Key.MaterialName,
                    Unit = g.Key.Unit,
                    MinStockLevel = g.Key.MinStockLevel,
                    WarehouseName = g.Key.WarehouseName,
                    QuantityOnHand = g.Sum(x => x.QuantityOnHand)
                })
                .Where(x => x.QuantityOnHand < x.MinStockLevel)
                .OrderBy(x => x.QuantityOnHand)
                .ToList();

            var lowStockMaterials = filteredLowStock.Take(6).ToList();
            var lowStockCount = filteredLowStock.Count;

            var todayReceipts = await _db.Receipts
                .AsNoTracking()
                .CountAsync(x => x.ReceiptDate >= today && x.ReceiptDate < tomorrow, ct);

            var todayIssues = await _db.IssueSlips
                .AsNoTracking()
                .CountAsync(x => x.IssueDate >= today && x.IssueDate < tomorrow, ct);

            var recentReceipts = await (
     from r in _db.Receipts.AsNoTracking()
     join rd in _db.ReceiptDetails.AsNoTracking() on r.ReceiptId equals rd.ReceiptId into rdg
     orderby r.ReceiptDate descending
     select new RecentReceiptDto
     {
         Id = r.ReceiptCode,
         Date = r.ReceiptDate ?? DateTime.MinValue,
         Supplier = rdg
             .Select(x => x.Supplier.Name)
             .FirstOrDefault() ?? "Không rõ nhà cung cấp",
         Items = rdg.Count(),
         Status = MapReceiptStatusText(r.Status),
         StatusKey = MapReceiptStatusKey(r.Status)
     }
 )
 .Take(5)
 .ToListAsync(ct);

            var recentIssues = await (
    from i in _db.IssueSlips.AsNoTracking()
    join p in _db.Projects.AsNoTracking() on i.ProjectId equals p.ProjectId into pg
    from p in pg.DefaultIfEmpty()
    join id in _db.IssueDetails.AsNoTracking() on i.IssueId equals id.IssueId into idg
    orderby i.IssueDate descending
    select new RecentIssueDto
    {
        Id = i.IssueCode,
        Date = i.IssueDate ?? DateTime.MinValue,
        Project = p != null ? p.Name : "Không rõ công trình",
        Items = idg.Count(),
        Status = MapIssueStatusText(i.Status),
        StatusKey = MapIssueStatusKey(i.Status)
    }
)
.Take(5)
.ToListAsync(ct);

            return new DashboardResponseDto
            {
                Summary = new DashboardSummaryDto
                {
                    TotalMaterials = totalMaterials,
                    LowStockCount = lowStockCount,
                    TodayReceipts = todayReceipts,
                    TodayIssues = todayIssues
                },
                LowStockMaterials = lowStockMaterials,
                RecentReceipts = recentReceipts,
                RecentIssues = recentIssues
            };
        }

        private static string MapReceiptStatusText(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Chờ nhập";

            return status.Trim().ToLower() switch
            {
                "completed" => "Đã nhập",
                "approved" => "Đã nhập",
                "received" => "Đã nhập",
                "pending" => "Chờ nhập",
                "submitted" => "Chờ nhập",
                "rejected" => "Từ chối",
                _ => status
            };
        }

        private static string MapReceiptStatusKey(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "pending";

            return status.Trim().ToLower() switch
            {
                "completed" => "done",
                "approved" => "done",
                "received" => "done",
                "rejected" => "reject",
                _ => "pending"
            };
        }

        private static string MapIssueStatusText(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Chờ xuất";

            return status.Trim().ToLower() switch
            {
                "completed" => "Đã xuất",
                "approved" => "Đã xuất",
                "issued" => "Đã xuất",
                "pending" => "Chờ xuất",
                "submitted" => "Chờ xuất",
                "rejected" => "Từ chối",
                _ => status
            };
        }

        private static string MapIssueStatusKey(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "pending";

            return status.Trim().ToLower() switch
            {
                "completed" => "done",
                "approved" => "done",
                "issued" => "done",
                "rejected" => "reject",
                _ => "pending"
            };
        }
    }
}