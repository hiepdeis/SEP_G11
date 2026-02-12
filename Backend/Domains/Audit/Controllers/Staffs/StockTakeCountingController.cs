using Backend.Data;
using Backend.Domains.Audit.DTOs.Staffs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Staffs;

[ApiController]
[Route("api/staff/audits")]
// [Authorize(Roles = "Warehouse Staff")] // bật lại khi test JWT ổn
public class StockTakeCountingController : ControllerBase
{
    private readonly MyDbContext _db;
    private readonly IWebHostEnvironment _env;

    public StockTakeCountingController(MyDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private int GetUserId()
    {
        // DEV: fix cứng cho test
        if (_env.IsDevelopment()) return 13;

        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("userId") ??
            User.FindFirstValue("id") ??
            User.FindFirstValue("sub");

        if (int.TryParse(idStr, out var uid)) return uid;
        throw new UnauthorizedAccessException("Invalid user identity.");
    }

    /// GET /api/staff/audits/{stockTakeId}/count-items?keyword=&uncountedOnly=true&skip=0&take=50&blind=false
    [HttpGet("{stockTakeId:int}/count-items")]
    public async Task<IActionResult> GetCountItems(
        int stockTakeId,
        [FromQuery] string? keyword = null,
        [FromQuery] bool uncountedOnly = false,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,

        CancellationToken ct = default)
    {
        var userId = GetUserId();

        // 1) staff phải thuộc team
        var isMember = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .AnyAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId && x.IsActive, ct);
        if (!isMember) return Forbid();

        // 2) lấy warehouseId của audit
        var st = await _db.StockTakes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
        if (st == null) return NotFound(new { message = "Audit not found." });

        if (take <= 0) take = 50;
        if (take > 200) take = 200;
        if (skip < 0) skip = 0;

        // 3) Query: InventoryCurrent (toàn kho) LEFT JOIN StockTakeDetail để biết đã đếm chưa
        var details = _db.StockTakeDetails.AsNoTracking().Where(d => d.StockTakeId == stockTakeId);

        var q =
            from ic in _db.InventoryCurrents.AsNoTracking()
            where ic.WarehouseId == st.WarehouseId
            join d in details
              on new { ic.MaterialId, BatchId = (int?)ic.BatchId, BinId = (int?)ic.BinId }
              equals new { d.MaterialId, d.BatchId, d.BinId }
              into gj
            from d in gj.DefaultIfEmpty()
            select new CountItemStaffDto
            {
                MaterialId = ic.MaterialId,
                BinId = ic.BinId,
                BatchId = ic.BatchId,

                MaterialName = ic.Material.Name,
                BatchCode = ic.Batch.BatchCode,
                BinCode = ic.Bin.Code,

                CountQty = d != null ? d.CountQty : null,
                CountedBy = d != null ? d.CountedBy : null,
                CountedAt = d != null ? d.CountedAt : null
            };



        // 4) Filter
        keyword = keyword?.Trim();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            if (int.TryParse(keyword, out var k))
            {
                q = q.Where(x => x.MaterialId == k || x.BatchId == k || x.BinId == k);
            }
            else
            {
                var like = $"%{keyword}%";

                q = q.Where(x =>
                    (x.MaterialName != null &&
                     EF.Functions.Like(EF.Functions.Collate(x.MaterialName, "Vietnamese_CI_AI"), like))
                    ||
                    (x.BinCode != null &&
                     EF.Functions.Like(EF.Functions.Collate(x.BinCode, "Vietnamese_CI_AI"), like))
                    ||
                    (x.BatchCode != null &&
                     EF.Functions.Like(EF.Functions.Collate(x.BatchCode, "Vietnamese_CI_AI"), like))
                );
            }
        }


        if (uncountedOnly)
            q = q.Where(x => x.CountQty == null);

        // 5) sort để staff đi “từ đầu đến cuối kho” dễ hơn: theo Bin rồi Material
        var data = await q
            .OrderBy(x => x.BinId)
            .ThenBy(x => x.MaterialId)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        return Ok(data);
    }

    [HttpPut("{stockTakeId:int}/count-items")]
    public async Task<IActionResult> UpsertCount(
     int stockTakeId,
     [FromBody] UpsertCountRequest req,
     CancellationToken ct = default)
    {
        var userId = GetUserId();

        if (req.CountQty < 0)
            return BadRequest(new { message = "CountQty must be >= 0." });

        // staff phải thuộc team
        var isMember = await _db.StockTakeTeamMembers
            .AnyAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId && x.IsActive, ct);
        if (!isMember) return Forbid();

        var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
        if (st == null) return NotFound(new { message = "Audit not found." });

        // 1) tìm BatchId từ BatchCode (mã lô staff đọc trên tag)
        var batchId = await _db.Batches.AsNoTracking()
            .Where(b => b.BatchCode == req.BatchCode && b.MaterialId == req.MaterialId) // siết chặt theo material
            .Select(b => b.BatchId)
            .FirstOrDefaultAsync(ct);

        if (batchId == 0)
            return BadRequest(new { message = "BatchCode not found for this material." });

        // 2) lấy InventoryCurrent đúng WH + material + bin + batchId
        var ic = await _db.InventoryCurrents.AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.WarehouseId == st.WarehouseId &&
                x.MaterialId == req.MaterialId &&
                x.BinId == req.BinId &&
                x.BatchId == batchId, ct);

        if (ic == null)
            return BadRequest(new { message = "InventoryCurrent row not found for this material/bin/batch." });

        var systemQty = ic.QuantityOnHand ?? 0m;
        var variance = req.CountQty - systemQty;

        // 3) upsert StockTakeDetail theo key (StockTakeId, MaterialId, BatchId, BinId)
        var d = await _db.StockTakeDetails
            .FirstOrDefaultAsync(x =>
                x.StockTakeId == stockTakeId &&
                x.MaterialId == req.MaterialId &&
                x.BatchId == batchId &&
                x.BinId == req.BinId, ct);

        if (d == null)
        {
            d = new Backend.Entities.StockTakeDetail
            {
                StockTakeId = stockTakeId,
                MaterialId = req.MaterialId,
                BatchId = batchId,
                BinId = req.BinId,

                SystemQty = systemQty,
                CountQty = req.CountQty,
                Variance = variance,

                CountedBy = userId,
                CountedAt = DateTime.UtcNow,

                DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy"
            };
            _db.StockTakeDetails.Add(d);
        }
        else
        {
            d.SystemQty = systemQty;
            d.CountQty = req.CountQty;
            d.Variance = variance;

            d.CountedBy = userId;
            d.CountedAt = DateTime.UtcNow;

            d.DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy";
        }

        await _db.SaveChangesAsync(ct);

        // BLIND: không trả SystemQty/Variance/DiscrepancyStatus cho staff
        return Ok(new
        {
            message = "Saved",
            countedQty = req.CountQty,
            batchCode = req.BatchCode,
            countedAt = d.CountedAt
        });
    }
}