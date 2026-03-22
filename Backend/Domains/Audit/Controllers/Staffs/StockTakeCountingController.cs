using Backend.Domains.Audit.DTOs.Staffs;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/staff/audits")]
    //[Authorize]
    public class StockTakeCountingController : ControllerBase
    {
        private readonly IStockTakeCountingService _stockTakeCountingService;

        public StockTakeCountingController(IStockTakeCountingService stockTakeCountingService)
        {
            _stockTakeCountingService = stockTakeCountingService;
        }

        private int GetCurrentUserId()
        {
            //var userIdClaim =
            //    User.FindFirst("UserId")?.Value ??
            //    User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            //    User.FindFirst("sub")?.Value;

            //if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            //    throw new UnauthorizedAccessException("UserId claim is missing or invalid.");

            //return userId;
            return 8;
        }

        [HttpGet("{stockTakeId:int}/counted-items")]
        public async Task<IActionResult> GetCountedItems(
    int stockTakeId,
    [FromQuery] int skip = 0,
    [FromQuery] int take = 50,
    CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var data = await _stockTakeCountingService.GetCountedItemsAsync(
                stockTakeId,
                userId,
                skip,
                take,
                ct);

            return Ok(data);
        }

        [HttpGet("{stockTakeId:int}/uncounted-items")]
        public async Task<IActionResult> GetUncountedItems(
            int stockTakeId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var data = await _stockTakeCountingService.GetUncountedItemsAsync(
                stockTakeId,
                userId,
                skip,
                take,
                ct);

            return Ok(data);
        }

        [HttpGet("{stockTakeId:int}/materials/suggest")]
        public async Task<IActionResult> SuggestMaterials(
            int stockTakeId,
            [FromQuery] string? keyword,
            [FromQuery] int take = 10,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var data = await _stockTakeCountingService.SuggestMaterialsAsync(
                stockTakeId,
                userId,
                keyword,
                take,
                ct);

            return Ok(data);
        }

        [HttpPost("{stockTakeId:int}/count-items")]
        public async Task<IActionResult> UpsertCount(
            int stockTakeId,
            [FromBody] UpsertCountRequest request,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var result = await _stockTakeCountingService.UpsertCountAsync(
                stockTakeId,
                userId,
                request,
                ct);

            if (!result.success)
                return BadRequest(new { message = result.message });

            return Ok(new { message = result.message });
        }

        [HttpGet("{stockTakeId:int}/recount-items")]
        public async Task<IActionResult> GetRecountItems(
            int stockTakeId,
            [FromQuery] string? keyword,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var data = await _stockTakeCountingService.GetRecountItemsAsync(
                stockTakeId,
                userId,
                keyword,
                skip,
                take,
                ct);

            return Ok(data);
        }

        [HttpPost("{stockTakeId:int}/recount-items")]
        public async Task<IActionResult> Recount(
            int stockTakeId,
            [FromBody] UpsertCountRequest request,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var result = await _stockTakeCountingService.RecountAsync(
                stockTakeId,
                userId,
                request,
                ct);

            if (!result.success)
                return BadRequest(new { message = result.message });

            return Ok(new { message = result.message });
        }
    }
}