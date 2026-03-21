using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Managers
{
    [ApiController]
    [Route("api/warehouse-manager/alerts")]
    public class StockShortageAlertsController : ControllerBase
    {
        private readonly IStockShortageAlertService _service;

        public StockShortageAlertsController(IStockShortageAlertService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAlerts()
        {
            try
            {
                var alerts = await _service.GetStockShortageAlertsAsync();
                var result = alerts.Select(ToDto).ToList();
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

        [HttpPut("{alertId:long}/confirm")]
        public async Task<IActionResult> ConfirmAlert(long alertId, [FromBody] ConfirmStockShortageAlertDto dto)
        {
            try
            {
                var managerId = 2; // TODO: replace with JWT claims
                var alert = await _service.ConfirmAlertAsync(alertId, managerId, dto.AdjustedQuantity, dto.Notes);
                return Ok(ToDto(alert));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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
