using Backend.Domains.Import.DTOs.Internal;
using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface IStockShortageAlertService
    {
        Task<List<StockShortageAlert>> GetStockShortageAlertsAsync();
        Task<StockShortageAlert?> GetStockShortageAlertAsync(long alertId);
        Task<StockShortageDetectResultDto> DetectShortagesAsync(int? warehouseId = null);
        Task<StockShortageDetectResultDto> CalculateStockShortageAsync(int? warehouseId = null);
        // Task<List<StockShortageAlert>> GetPendingAlertsAsync();
        // Task<StockShortageAlert> ConfirmAlertAsync(long alertId, int managerId, decimal? adjustedQuantity, string? notes);
        Task<List<StockShortageAlert>> BulkConfirmAlertsAsync(List<BulkConfirmAlertItemDto> requestItems, int managerId);
    }
}