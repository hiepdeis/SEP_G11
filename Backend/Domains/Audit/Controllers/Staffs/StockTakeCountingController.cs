using Backend.Domains.Audit.DTOs.Staffs;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Staffs;

[ApiController]
[Route("api/staff/audits")]
// [Authorize(Roles = "Warehouse Staff")] // bật lại khi test JWT ổn
public class StockTakeCountingController : ControllerBase
{
    private readonly IStockTakeCountingService _service;
    private readonly IWebHostEnvironment _env;

    public StockTakeCountingController(IStockTakeCountingService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    private int GetUserId()
    {
        // DEV: fix cứng cho test
        if (_env.IsDevelopment()) return 4;

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

        try
        {
            var data = await _service.GetCountItemsAsync(stockTakeId, userId, keyword, uncountedOnly, skip, take, ct);
            return Ok(data);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{stockTakeId:int}/count-items")]
    public async Task<IActionResult> UpsertCount(
        int stockTakeId,
        [FromBody] UpsertCountRequest req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();

        try
        {
            var (success, message) = await _service.UpsertCountAsync(stockTakeId, userId, req, ct);
            
            if (!success)
                return BadRequest(new { message });

            // BLIND: don't return SystemQty/Variance/DiscrepancyStatus to staff
            return Ok(new
            {
                message = "Saved",
                countedQty = req.CountQty,
                batchCode = req.BatchCode,
                countedAt = DateTime.UtcNow
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
