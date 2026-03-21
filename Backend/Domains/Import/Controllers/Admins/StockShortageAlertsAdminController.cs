using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/alerts")]
    public class StockShortageAlertsAdminController : ControllerBase
    {
        private readonly IStockShortageAlertService _service;

        public StockShortageAlertsAdminController(IStockShortageAlertService service)
        {
            _service = service;
        }

        [HttpGet("confirmed")]
        public async Task<IActionResult> GetConfirmedAlerts()
        {
            try
            {
                var alerts = await _service.GetStockShortageAlertsAsync();
                var result = alerts
                    .Where(a => a.Status == "ManagerConfirmed")
                    .Select(ToDto)
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{alertId:long}")]
        public async Task<IActionResult> GetAlert(long alertId)
        {
            try
            {
                var alert = await _service.GetStockShortageAlertAsync(alertId);
                if (alert == null)
                    return NotFound(new { message = "Alert not found" });

                return Ok(ToDto(alert));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        private static StockShortageAlertDto ToDto(StockShortageAlert alert)
        {
            return new StockShortageAlertDto
            {
                AlertId = alert.AlertId,
                MaterialId = alert.MaterialId,
                MaterialCode = alert.Material?.Code ?? string.Empty,
                MaterialName = alert.Material?.Name ?? string.Empty,
                WarehouseId = alert.WarehouseId,
                WarehouseName = alert.Warehouse?.Name ?? string.Empty,
                CurrentQuantity = alert.CurrentQuantity,
                MinStockLevel = alert.MinStockLevel,
                SuggestedQuantity = alert.SuggestedQuantity,
                Status = alert.Status,
                Priority = alert.Priority,
                CreatedAt = alert.CreatedAt,
                ConfirmedAt = alert.ConfirmedAt,
                ConfirmedBy = alert.ConfirmedBy,
                Notes = alert.Notes
            };
        }
    }
}
