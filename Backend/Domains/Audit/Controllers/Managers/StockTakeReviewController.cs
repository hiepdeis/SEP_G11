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

    /// GET /api/manager/audits?skip=0&take=50&stockTakeId=1&status=InProgress&warehouseId=1&fromDate=2024-01-01&toDate=2024-12-31
    /// Returns paginated list of all audits with quick metrics
    [HttpGet]
    public async Task<IActionResult> GetAllAudits(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        [FromQuery] int? stockTakeId = null,
        [FromQuery] string? status = null,
        [FromQuery] int? warehouseId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        try
        {
            var (audits, totalCount) = await _service.GetAllAuditsAsync(
                skip, take, status, warehouseId, fromDate, toDate, ct);

            // Filter by stockTakeId if provided
            if (stockTakeId.HasValue && stockTakeId > 0)
            {
                audits = audits.Where(x => x.StockTakeId == stockTakeId).ToList();
                totalCount = audits.Count;
            }

            return Ok(new
            {
                total = totalCount,
                skip,
                take,
                items = audits
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving audits", error = ex.Message });
        }
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

    /// GET /api/manager/audits/{stockTakeId}/variances/details?resolved=false
    /// Returns full list of variance details in one request (no pagination)
    [HttpGet("{stockTakeId:int}/variances/details")]
    public async Task<IActionResult> GetVarianceDetails(
        int stockTakeId,
        [FromQuery] bool? resolved = null,
        CancellationToken ct = default)
    {
        try
        {
            var (variances, totalCount, unresolvedCount) = await _service.GetVarianceDetailsAsync(stockTakeId, resolved, ct);
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

    /// GET /api/manager/audits/{stockTakeId}/variances/{detailId}
    /// Returns detailed info for a specific variance item
    [HttpGet("{stockTakeId:int}/variances/{detailId:long}")]
    public async Task<IActionResult> GetVarianceDetail(
        int stockTakeId,
        long detailId,
        CancellationToken ct = default)
    {
        try
        {
            var variance = await _service.GetVarianceDetailAsync(stockTakeId, detailId, ct);
            if (variance == null)
                return NotFound(new { message = "Variance detail not found." });

            return Ok(variance);
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

    /// PUT /api/manager/audits/{stockTakeId}/variances/{detailId}/request-recount
    /// Manager requests recount for a discrepancy item
    [HttpPut("{stockTakeId:int}/variances/{detailId:long}/request-recount")]
    public async Task<IActionResult> RequestRecount(
        int stockTakeId,
        long detailId,
        [FromBody] RequestRecountRequest? req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();

        var (success, message) = await _service.RequestRecountAsync(
            stockTakeId,
            detailId,
            req ?? new RequestRecountRequest(),
            userId,
            ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }
    /// PUT /api/manager/audits/{stockTakeId}/variances/{detailId}/reason
    /// Manager updates the reason for a variance (why it's missing/excess)
    [HttpPut("{stockTakeId:int}/variances/{detailId:long}/reason")]
    public async Task<IActionResult> UpdateVarianceReason(
        int stockTakeId,
        long detailId,
        [FromBody] UpdateVarianceReasonRequest req,
        CancellationToken ct = default)
    {
        var (success, message) = await _service.UpdateVarianceReasonAsync(stockTakeId, detailId, req, ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message = "Variance reason updated successfully." });
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
        [FromBody] SignOffRequest? req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        var (success, message, signature) = await _service.SignOffAsync(stockTakeId, userId, req ?? new SignOffRequest(), ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message = "Audit signed off successfully.", signature });
    }

   

    /// POST /api/manager/audits/{stockTakeId}/complete
    /// Manager completes the audit - final action
    [HttpPost("{stockTakeId:int}/complete")]
    public async Task<IActionResult> CompleteAudit(
        int stockTakeId,
        [FromBody] CompleteAuditRequest? req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        var (success, message) = await _service.CompleteAuditAsync(stockTakeId, userId, req ?? new CompleteAuditRequest(), ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }
}
