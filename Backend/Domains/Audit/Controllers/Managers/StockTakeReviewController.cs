using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Managers;

[ApiController]
[Route("api/manager/audits")]
// [Authorize(Roles = "Warehouse Manager")]
public class StockTakeReviewController : ControllerBase
{
    private readonly IStockTakeReviewService _service;
    private readonly IWebHostEnvironment _env;

    public StockTakeReviewController(IStockTakeReviewService service, IWebHostEnvironment env)
    {
        _service = service;
        _env = env;
    }

    private int GetUserId()
    {
        // DEV: fix cứng cho test
        if (_env.IsDevelopment()) return 1;

        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("userId") ??
            User.FindFirstValue("id") ??
            User.FindFirstValue("sub");

        if (int.TryParse(idStr, out var uid)) return uid;
        throw new UnauthorizedAccessException("Invalid user identity.");
    }

    /// GET /api/manager/audits/{stockTakeId}/metrics
    /// Returns overview metrics: Total, Counted, Uncounted, Matched, Discrepancies
    [HttpGet("{stockTakeId:int}/metrics")]
    public async Task<IActionResult> GetMetrics(int stockTakeId, CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetMetricsAsync(stockTakeId, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// GET /api/manager/audits/{stockTakeId}/variances?skip=0&take=50&resolved=false
    /// Returns list of variance items (discrepancies) for review
    [HttpGet("{stockTakeId:int}/variances")]
    public async Task<IActionResult> GetVariances(
        int stockTakeId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        [FromQuery] bool? resolved = null,
        CancellationToken ct = default)
    {
        try
        {
            var (variances, totalCount, unresolvedCount) = await _service.GetVariancesAsync(stockTakeId, skip, take, resolved, ct);
            return Ok(new
            {
                total = totalCount,
                unresolved = unresolvedCount,
                items = variances
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// PUT /api/manager/audits/{stockTakeId}/variances/{detailId}/resolve
    /// Manager resolves a variance with action and reason
    [HttpPut("{stockTakeId:int}/variances/{detailId:long}/resolve")]
    public async Task<IActionResult> ResolveVariance(
        int stockTakeId,
        long detailId,
        [FromBody] ResolveVarianceRequest req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        var (success, message) = await _service.ResolveVarianceAsync(stockTakeId, detailId, req, userId, ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message = "Variance resolved successfully." });
    }

    /// GET /api/manager/audits/{stockTakeId}/review-detail
    /// Returns full review detail including signatures and current state
    [HttpGet("{stockTakeId:int}/review-detail")]
    public async Task<IActionResult> GetReviewDetail(int stockTakeId, CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetReviewDetailAsync(stockTakeId, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// POST /api/manager/audits/{stockTakeId}/sign-off
    /// Manager/Staff signs off the audit review
    [HttpPost("{stockTakeId:int}/sign-off")]
    public async Task<IActionResult> SignOff(
        int stockTakeId,
        [FromBody] SignOffRequest req,
        CancellationToken ct = default)
    {
        // TODO: Refactor to service layer
        return StatusCode(StatusCodes.Status501NotImplemented);
    }

    /// POST /api/manager/audits/{stockTakeId}/complete
    /// Manager completes the audit - final action
    [HttpPost("{stockTakeId:int}/complete")]
    public async Task<IActionResult> CompleteAudit(
        int stockTakeId,
        [FromBody] CompleteAuditRequest req,
        CancellationToken ct = default)
    {
        // TODO: Refactor to service layer
        return StatusCode(StatusCodes.Status501NotImplemented);
    }
}
