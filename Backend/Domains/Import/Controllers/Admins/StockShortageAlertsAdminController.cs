using System.Collections.Generic;
using System.Linq;
using Backend.Data;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/alerts")]
    public class StockShortageAlertsAdminController : ControllerBase
    {
        private readonly IStockShortageAlertService _service;
        private readonly MyDbContext _context;

        public StockShortageAlertsAdminController(IStockShortageAlertService service, MyDbContext context)
        {
            _service = service;
            _context = context;
        }

        [HttpGet("confirmed")]
        public async Task<IActionResult> GetConfirmedAlerts()
        {
            try
            {
                var alerts = await _service.GetStockShortageAlertsAsync();
                var confirmed = alerts
                    .Where(a => a.Status == "ManagerConfirmed")
                    .ToList();

                var userNames = await LoadUserNamesAsync(confirmed);
                var result = confirmed
                    .Select(a => ToDto(a, userNames))
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

                var userNames = await LoadUserNamesAsync(new[] { alert });
                return Ok(ToDto(alert, userNames));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        private static StockShortageAlertDto ToDto(
            StockShortageAlert alert,
            IReadOnlyDictionary<int, string> userNames)
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
                ConfirmedByName = GetUserName(userNames, alert.ConfirmedBy),
                Notes = alert.Notes,
                Unit = alert.Material?.Unit,
                IsDecimalUnit = alert.Material?.IsDecimalUnit ?? false
            };
        }

        private async Task<Dictionary<int, string>> LoadUserNamesAsync(IEnumerable<StockShortageAlert> alerts)
        {
            var userIds = alerts
                .Select(a => a.ConfirmedBy)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            if (userIds.Count == 0)
                return new Dictionary<int, string>();

            return await _context.Users
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(
                    u => u.UserId,
                    u => string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName);
        }

        private static string? GetUserName(IReadOnlyDictionary<int, string> userNames, int? userId)
        {
            if (!userId.HasValue)
                return null;

            return userNames.TryGetValue(userId.Value, out var name) ? name : null;
        }
    }
}
