using Backend.Data;
using Backend.Domains.Import.DTOs.Internal;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class StockShortageAlertService : IStockShortageAlertService
    {
        private readonly MyDbContext _context;

        public StockShortageAlertService(MyDbContext context)
        {
            _context = context;
        }

        public async Task<List<StockShortageAlert>> GetStockShortageAlertsAsync()
        {
            return await _context.StockShortageAlerts
                .Include(a => a.Material)
                .Include(a => a.Warehouse)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<StockShortageAlert?> GetStockShortageAlertAsync(long alertId)
        {
            return await _context.StockShortageAlerts
                .Include(a => a.Material)
                .Include(a => a.Warehouse)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.AlertId == alertId);
        }

        public async Task<StockShortageDetectResultDto> DetectShortagesAsync(int? warehouseId = null)
        {
            var activeStatuses = new[] { "Pending", "ManagerConfirmed", "PRCreated" };

            var activeAlerts = await _context.StockShortageAlerts
                .Where(a => activeStatuses.Contains(a.Status))
                .ToListAsync();

            var activeAlertMap = activeAlerts
                .ToDictionary(a => (a.MaterialId, a.WarehouseId));

            var inventoryQuery = _context.InventoryCurrents.AsQueryable();
            if (warehouseId.HasValue)
                inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);

            var inventoryGroups = await inventoryQuery
                .GroupBy(i => new { i.MaterialId, i.WarehouseId })
                .Select(g => new
                {
                    g.Key.MaterialId,
                    g.Key.WarehouseId,
                    QuantityOnHand = g.Sum(x => x.QuantityOnHand ?? 0)
                })
                .ToListAsync();

            var materialMap = await _context.Materials
                .Where(m => m.MinStockLevel.HasValue)
                .ToDictionaryAsync(m => m.MaterialId, m => m);

            var now = DateTime.UtcNow;
            var newAlerts = new List<StockShortageAlert>();
            var updatedAlerts = 0;

            foreach (var group in inventoryGroups)
            {

                if (!materialMap.TryGetValue(group.MaterialId, out var material))
                    continue;

                var minStock = material.MinStockLevel ?? 0;
                if (group.QuantityOnHand >= minStock)
                    continue;

                var suggestedQuantity = CalculateSuggestedQuantity(material, group.QuantityOnHand);
                var priority = CalculatePriority(group.QuantityOnHand, minStock);

                var key = (group.MaterialId, group.WarehouseId);
                if (activeAlertMap.TryGetValue(key, out var existingAlert))
                {
                    var hasChanges = false;

                    if (existingAlert.CurrentQuantity != group.QuantityOnHand)
                    {
                        existingAlert.CurrentQuantity = group.QuantityOnHand;
                        hasChanges = true;
                    }

                    if (existingAlert.MinStockLevel != material.MinStockLevel)
                    {
                        existingAlert.MinStockLevel = material.MinStockLevel;
                        hasChanges = true;
                    }

                    if (existingAlert.SuggestedQuantity != suggestedQuantity)
                    {
                        existingAlert.SuggestedQuantity = suggestedQuantity;
                        hasChanges = true;
                    }

                    if (existingAlert.Priority != priority)
                    {
                        existingAlert.Priority = priority;
                        hasChanges = true;
                    }

                    if (hasChanges)
                        updatedAlerts++;

                    continue;
                }

                var alert = new StockShortageAlert
                {
                    MaterialId = group.MaterialId,
                    WarehouseId = group.WarehouseId,
                    CurrentQuantity = group.QuantityOnHand,
                    MinStockLevel = material.MinStockLevel,
                    SuggestedQuantity = suggestedQuantity,
                    Priority = priority,
                    Status = "Pending",
                    CreatedAt = now
                };

                newAlerts.Add(alert);
            }

            if (newAlerts.Count > 0)
                _context.StockShortageAlerts.AddRange(newAlerts);

            if (newAlerts.Count > 0)
                await CreateManagerNotificationsAsync(newAlerts, materialMap, now);

            if (newAlerts.Count > 0 || updatedAlerts > 0)
                await _context.SaveChangesAsync();

            return new StockShortageDetectResultDto
            {
                TotalScanned = inventoryGroups.Count,
                NewAlerts = newAlerts.Count,
                UpdatedAlerts = updatedAlerts,
                Alerts = newAlerts
            };
        }

        public Task<StockShortageDetectResultDto> CalculateStockShortageAsync(int? warehouseId = null)
        {
            return DetectShortagesAsync(warehouseId);
        }

        // public async Task<List<StockShortageAlert>> GetPendingAlertsAsync()
        // {
        //     return await _context.StockShortageAlerts
        //         .Include(a => a.Material)
        //         .Include(a => a.Warehouse)
        //         .Where(a => a.Status == "Pending")
        //         .OrderByDescending(a => a.CreatedAt)
        //         .AsNoTracking()
        //         .ToListAsync();
        // }

        // public async Task<StockShortageAlert> ConfirmAlertAsync(long alertId, int managerId, decimal? adjustedQuantity, string? notes)
        // {
        //     var alert = await _context.StockShortageAlerts
        //         .Include(a => a.Material)
        //         .Include(a => a.Warehouse)
        //         .FirstOrDefaultAsync(a => a.AlertId == alertId);

        //     if (alert == null)
        //         throw new KeyNotFoundException($"Alert with ID {alertId} not found");

        //     if (alert.Status == "ManagerConfirmed")
        //         throw new InvalidOperationException("Alert is already confirmed by manager");

        //     if (adjustedQuantity.HasValue)
        //     {
        //         if (adjustedQuantity.Value <= 0)
        //             throw new ArgumentException("Số lượng điều chỉnh phải lớn hơn 0");

        //         if (adjustedQuantity.Value < alert.Material.MinStockLevel)
        //             throw new ArgumentException("Số lượng điều chỉnh không được nhỏ hơn mức tồn tối thiểu của vật liệu");

        //         if (alert.Material.MaxStockLevel.HasValue && (alert.CurrentQuantity + adjustedQuantity.Value) > alert.Material.MaxStockLevel.Value)
        //         {
        //             throw new ArgumentException($"Tổng số lượng tồn hiện tại và lượng cần mua vượt quá mức tồn tối đa ({alert.Material.MaxStockLevel.Value})");
        //         }

        //         alert.SuggestedQuantity = adjustedQuantity.Value;
        //     }

        //     alert.Status = "ManagerConfirmed";
        //     alert.ConfirmedBy = managerId;
        //     alert.ConfirmedAt = DateTime.UtcNow;

        //     if (!string.IsNullOrWhiteSpace(notes))
        //         alert.Notes = notes;

        //     await CreateAdminNotificationsAsync(alert, DateTime.UtcNow);
        //     await _context.SaveChangesAsync();

        //     return alert;
        // }

        public async Task<List<StockShortageAlert>> BulkConfirmAlertsAsync(List<BulkConfirmAlertItemDto> requestItems, int managerId)
        {
            if (requestItems == null || requestItems.Count == 0)
                return new List<StockShortageAlert>();

            var alertIds = requestItems
                .Select(x => x.AlertId)
                .Distinct()
                .ToList();

            var alerts = await _context.StockShortageAlerts
                .Include(a => a.Material)
                .Include(a => a.Warehouse)
                .Where(a => alertIds.Contains(a.AlertId) && a.Status == "Pending")
                .ToListAsync();

            var requestMap = requestItems
                .GroupBy(x => x.AlertId)
                .ToDictionary(g => g.Key, g => g.Last());

            var now = DateTime.UtcNow;

            foreach (var alert in alerts)
            {
                if (!requestMap.TryGetValue(alert.AlertId, out var requestItem))
                    continue;

                if (requestItem.AdjustedQuantity.HasValue)
                {
                    var adjustedQuantity = requestItem.AdjustedQuantity.Value;

                    if (adjustedQuantity <= 0)
                        throw new ArgumentException("Số lượng điều chỉnh phải lớn hơn 0");

                    if (alert.Material.MinStockLevel.HasValue && adjustedQuantity < alert.Material.MinStockLevel.Value)
                    {
                        throw new ArgumentException("Số lượng điều chỉnh không được nhỏ hơn mức tồn tối thiểu của vật liệu");
                    }

                    if (alert.Material.MaxStockLevel.HasValue && (alert.CurrentQuantity + adjustedQuantity) > alert.Material.MaxStockLevel.Value)
                    {
                        throw new ArgumentException($"Tổng số lượng tồn hiện tại và lượng cần mua vượt quá mức tồn tối đa ({alert.Material.MaxStockLevel.Value})");
                    }

                    alert.SuggestedQuantity = adjustedQuantity;
                }

                alert.Status = "ManagerConfirmed";
                alert.ConfirmedBy = managerId;
                alert.ConfirmedAt = now;

                if (!string.IsNullOrWhiteSpace(requestItem.Notes))
                    alert.Notes = requestItem.Notes;
            }

            await CreateAdminNotificationsAsync(alerts, now);
            await _context.SaveChangesAsync();

            return alerts;
        }

        private static decimal? CalculateSuggestedQuantity(Material material, decimal currentQuantity)
        {
            if (material.MaxStockLevel.HasValue && material.MaxStockLevel.Value > currentQuantity)
            {
                return material.MaxStockLevel.Value - currentQuantity;
            }

            if (material.MinStockLevel.HasValue && material.MinStockLevel.Value > currentQuantity)
            {
                return material.MinStockLevel.Value - currentQuantity;
            }

            return null;
        }

        private static string? CalculatePriority(decimal currentQuantity, decimal minStockLevel)
        {
            if (minStockLevel <= 0)
                return null;

            if (currentQuantity == 0)
                return "Critical";

            var half = minStockLevel * 0.5m;
            if (currentQuantity < half)
                return "High";

            if (currentQuantity < minStockLevel)
                return "Medium";

            return null;
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateManagerNotificationsAsync(
            List<StockShortageAlert> alerts,
            Dictionary<int, Material> materialMap,
            DateTime now)
        {
            var managerIds = await GetUserIdsByRoleAsync("Manager");
            if (managerIds.Count == 0)
                return;

            var notifications = new List<Notification>();

            foreach (var alert in alerts)
            {
                var materialName = materialMap.TryGetValue(alert.MaterialId, out var material)
                    ? material.Name
                    : $"Material {alert.MaterialId}";

                var message = $"New stock shortage alert for {materialName}.";
                if (alert.WarehouseId.HasValue)
                    message += $" Warehouse {alert.WarehouseId}.";

                foreach (var managerId in managerIds)
                {
                    notifications.Add(new Notification
                    {
                        UserId = managerId,
                        Message = message,
                        RelatedEntityType = "StockShortageAlert",
                        RelatedEntityId = alert.AlertId,
                        IsRead = false,
                        CreatedAt = now
                    });
                }
            }

            if (notifications.Any())
            {
                _context.Notifications.AddRange(notifications);
            }
        }

        // private async Task CreateAdminNotificationsAsync(StockShortageAlert alert, DateTime now)
        // {
        //     var adminIds = await GetUserIdsByRoleAsync("Admin");
        //     if (adminIds.Count == 0)
        //         return;

        //     var materialName = alert.Material?.Name ?? $"Material {alert.MaterialId}";
        //     var message = $"Alert {alert.AlertId} for {materialName} was confirmed by manager.";

        //     var notifications = new List<Notification>();

        //     foreach (var adminId in adminIds)
        //     {
        //         notifications.Add(new Notification
        //         {
        //             UserId = adminId,
        //             Message = message,
        //             RelatedEntityType = "StockShortageAlert",
        //             RelatedEntityId = alert.AlertId,
        //             IsRead = false,
        //             CreatedAt = now
        //         });
        //     }

        //     if (notifications.Any())
        //     {
        //         _context.Notifications.AddRange(notifications);
        //     }
        // }

        private async Task CreateAdminNotificationsAsync(List<StockShortageAlert> alerts, DateTime now)
        {
            if (alerts.Count == 0)
                return;

            var adminIds = await GetUserIdsByRoleAsync("Admin");
            if (adminIds.Count == 0)
                return;

            var notifications = new List<Notification>();

            foreach (var alert in alerts)
            {
                var materialName = alert.Material?.Name ?? $"Material {alert.MaterialId}";
                var message = $"Alert {alert.AlertId} for {materialName} was confirmed by manager.";

                foreach (var adminId in adminIds)
                {
                    notifications.Add(new Notification
                    {
                        UserId = adminId,
                        Message = message,
                        RelatedEntityType = "StockShortageAlert",
                        RelatedEntityId = alert.AlertId,
                        IsRead = false,
                        CreatedAt = now
                    });
                }
            }

            if (notifications.Any())
            {
                _context.Notifications.AddRange(notifications);
            }
        }
    }
}