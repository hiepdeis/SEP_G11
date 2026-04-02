using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Internal
{
    [ApiController]
    [Route("api/internal/stock-shortage")]
    public class StockShortageInternalController : ControllerBase
    {
        private readonly IStockShortageAlertService _service;

        public StockShortageInternalController(IStockShortageAlertService service)
        {
            _service = service;
        }

        [HttpPost("calculate")]
        public async Task<IActionResult> Calculate([FromQuery] int? warehouseId)
        {
            try
            {
                var result = await _service.DetectShortagesAsync(warehouseId);
                return Ok(new
                {
                    totalScanned = result.TotalScanned,
                    newAlerts = result.NewAlerts,
                    updatedAlerts = result.UpdatedAlerts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
