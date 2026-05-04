using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Managers;

[ApiController]
[Route("api/manager/audits")]
[Authorize]
public class StockTakeReviewController : ControllerBase
{
    private readonly IStockTakeReviewService _service;
    private readonly IStockTakeCountingService _countingService;

    public StockTakeReviewController(
        IStockTakeReviewService service,
        IStockTakeCountingService countingService)
    {
        _service = service;
        _countingService = countingService;
    }

    private int GetUserId()
    {
        return User.GetRequiredUserId();
    }

    [HttpGet]
    [Authorize(Roles = "WarehouseManager,Accountant,WarehouseStaff,Admin")]
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
                skip, take, stockTakeId, status, warehouseId, fromDate, toDate, ct);

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



    [HttpGet("{stockTakeId:int}/variances/details")]
    [Authorize(Roles = "WarehouseManager, Accountant, Admin")]
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


    [HttpPut("{stockTakeId:int}/variances/{detailId:long}/resolve")]
    [Authorize(Roles = "WarehouseManager, Admin")]
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

    [HttpPut("{stockTakeId:int}/variances/bulk-resolve")]
    [Authorize(Roles = "WarehouseManager, Admin")]
    public async Task<IActionResult> ResolveVariances(
        int stockTakeId,
        [FromBody] BulkResolveVarianceRequest req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        var (success, message) = await _service.ResolveVariancesAsync(stockTakeId, req, userId, ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPost("{stockTakeId:int}/request-recount-all")]
    [Authorize(Roles = "WarehouseManager, Admin")]
    public async Task<IActionResult> RequestRecountAll(
        int stockTakeId,
        [FromBody] RequestRecountRequest? req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();

        var (success, message) = await _service.RequestRecountAllAsync(
            stockTakeId,
            req ?? new RequestRecountRequest(),
            userId,
            ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPost("{stockTakeId:int}/confirm-resolution")]
    [Authorize(Roles = "WarehouseManager, Admin")]
    public async Task<IActionResult> ConfirmResolution(
        int stockTakeId,
        [FromBody] ApproveResolveRequest? req,
        CancellationToken ct = default)
    {
        var userId = GetUserId();

        var (success, message) = await _service.ManagerConfirmResolutionAsync(
            stockTakeId,
            userId,
            req?.SignatureData,
            ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }


    [HttpGet("{stockTakeId:int}/review-detail")]
    [Authorize(Roles = "WarehouseManager, Accountant, Admin")]
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

    [HttpPost("{stockTakeId:int}/sign-off")]
    [Authorize(Roles = "WarehouseManager,WarehouseStaff,Accountant,Admin")]
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

    [HttpGet("{stockTakeId:int}/recount-candidates")]
    [Authorize(Roles = "WarehouseManager, Accountant, Admin")]
    public async Task<IActionResult> GetRecountCandidates(
        int stockTakeId,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _countingService.GetRecountCandidatesAsync(stockTakeId, ct);
            return Ok(new
            {
                total = result.Count,
                items = result
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("{stockTakeId:int}/recount-candidates/{targetUserId:int}/rejoin")]
    [Authorize(Roles = "WarehouseManager, Admin")]
    public async Task<IActionResult> RejoinForRecount(
        int stockTakeId,
        int targetUserId,
        CancellationToken ct = default)
    {
        var managerUserId = GetUserId();

        var (success, message) = await _countingService.RejoinForRecountAsync(
            stockTakeId,
            targetUserId,
            managerUserId,
            ct);

        if (!success)
            return BadRequest(new { message });

        return Ok(new { message });
    }

}
