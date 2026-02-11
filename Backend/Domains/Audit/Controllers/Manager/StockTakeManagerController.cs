using Backend.Domains.Audit.DTOs.Manager;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Manager;

[ApiController]
[Route("api/stocktakes/manager")]
public class StockTakeManagerController : ControllerBase
{
    private readonly IStockTakeService _service;
    public StockTakeManagerController(IStockTakeService service) => _service = service;

    // Manager lấy tất cả dòng (status optional)
    // GET /api/stocktakes/manager/{stockTakeId}/details?status=Discrepancy
    [HttpGet("{stockTakeId:int}/details")]
    //[Authorize]
    public async Task<ActionResult<List<StockTakeDetailForManagerResponse>>> GetDetails(
        [FromRoute] int stockTakeId,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var result = await _service.GetDetailsForManagerAsync(stockTakeId, status, ct);
        return Ok(result);
    }

    // Shortcut: Manager lấy riêng dòng lệch
    // GET /api/stocktakes/manager/{stockTakeId}/discrepancies
    [HttpGet("{stockTakeId:int}/discrepancies")]
    //[Authorize]
    public async Task<ActionResult<List<StockTakeDetailForManagerResponse>>> GetDiscrepancies(
        [FromRoute] int stockTakeId,
        CancellationToken ct)
    {
        var result = await _service.GetDetailsForManagerAsync(stockTakeId, "Discrepancy", ct);
        return Ok(result);
    }
}
