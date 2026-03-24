using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.DTOs.Managers;

namespace Backend.Domains.Import.Interfaces
{
    public interface IReceiptService
    {
        // Warehouse staff flow
        Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync();
        Task<GetInboundRequestListDto> GetReceiptDetailForWarehouseAsync(long receiptId);
        Task ConfirmGoodsReceiptAsync(long receiptId, ConfirmGoodsReceiptDto dto, int staffId);
        Task<ReceiveGoodsFromPoResultDto> ReceiveGoodsFromPOAsync(ReceiveGoodsFromPoDto dto, int staffId);
        Task<List<PendingPurchaseOrderDto>> GetPendingPurchaseOrdersAsync();
        Task<ReceiptPutawayResultDto> PutawayAsync(long receiptId, ReceiptPutawayDto dto, int staffId);
        Task<List<ReceiptBatchLookupDto>> GetBatchesAsync(int materialId, string? batchCode);

        // Manager flow
        Task<List<ManagerReceiptSummaryDto>> GetReceiptsForManagerAsync(string? status);
        Task<ManagerReceiptDetailDto> GetReceiptForManagerAsync(long receiptId);
        Task<ManagerReceiptStampResultDto> StampReceiptAsync(long receiptId, ManagerReceiptStampDto dto, int managerId);

        // Warehouse Card flow
        Task<List<WarehouseCardDto>> GetWarehouseCardsAsync(WarehouseCardQueryDto query);
        Task<List<WarehouseCardDto>> GetWarehouseCardsByMaterialAsync(int materialId);

        // QC Check flow
        Task<QCCheckDto> GetQCCheckByReceiptAsync(long receiptId);

        // Incident Report flow
        Task<IncidentReportCreateResultDto> CreateIncidentReportAsync(long receiptId, CreateIncidentReportDto dto, int staffId);
        Task<IncidentReportDto> GetIncidentReportByReceiptAsync(long receiptId);
        Task<List<IncidentReportSummaryDto>> GetAllIncidentReportsAsync();

        // Accountant flow
        Task<List<AccountantReceiptSummaryDto>> GetReceiptsForAccountantAsync(string? status);
        Task<AccountantReceiptDetailDto> GetReceiptForAccountantAsync(long receiptId);
        Task<AccountantReceiptCloseResultDto> CloseReceiptAsync(long receiptId, AccountantReceiptCloseDto dto, int accountantId);
    }
}