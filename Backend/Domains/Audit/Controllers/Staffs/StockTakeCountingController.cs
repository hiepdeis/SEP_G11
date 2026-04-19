using Backend.Domains.Audit.DTOs.Staffs;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/staff/audits")]
    [Authorize(Roles = "WarehouseStaff")]
    public class StockTakeCountingController : ControllerBase
    {
        private readonly IStockTakeCountingService _stockTakeCountingService;

        public StockTakeCountingController(IStockTakeCountingService stockTakeCountingService)
        {
            _stockTakeCountingService = stockTakeCountingService;
        }

        private int GetCurrentUserId()
        {
            return User.GetRequiredUserId();
        }

        private async Task<IActionResult> ExecuteReadAsync<T>(Func<Task<T>> action)
        {
            try
            {
                var data = await action();
                return Ok(data);
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

        [HttpGet("{stockTakeId:int}/counted-items")]
        public async Task<IActionResult> GetCountedItems(
            int stockTakeId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            return await ExecuteReadAsync(async () =>
            {
                var userId = GetCurrentUserId();

                return await _stockTakeCountingService.GetCountedItemsAsync(
                    stockTakeId,
                    userId,
                    skip,
                    take,
                    ct);
            });
        }

        [HttpGet("{stockTakeId:int}/uncounted-items")]
        public async Task<IActionResult> GetUncountedItems(
            int stockTakeId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            return await ExecuteReadAsync(async () =>
            {
                var userId = GetCurrentUserId();

                return await _stockTakeCountingService.GetUncountedItemsAsync(
                    stockTakeId,
                    userId,
                    skip,
                    take,
                    ct);
            });
        }

        [HttpGet("{stockTakeId:int}/materials/suggest")]
        public async Task<IActionResult> SuggestMaterials(
            int stockTakeId,
            [FromQuery] string? keyword,
            [FromQuery] int take = 10,
            CancellationToken ct = default)
        {
            return await ExecuteReadAsync(async () =>
            {
                var userId = GetCurrentUserId();

                return await _stockTakeCountingService.SuggestMaterialsAsync(
                    stockTakeId,
                    userId,
                    keyword,
                    take,
                    ct);
            });
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
            return await ExecuteReadAsync(async () =>
            {
                var userId = GetCurrentUserId();

                return await _stockTakeCountingService.GetRecountItemsAsync(
                    stockTakeId,
                    userId,
                    keyword,
                    skip,
                    take,
                    ct);
            });
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
