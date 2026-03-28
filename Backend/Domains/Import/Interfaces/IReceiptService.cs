using Backend.Domains.Import.DTOs.Staff;

namespace Backend.Domains.Import.Interfaces
{
    public interface IReceiptService
    {
        // Warehouse staff flow
        Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync();
        Task<GetInboundRequestListDto> GetReceiptDetailForWarehouseAsync(long receiptId);
        Task ConfirmGoodsReceiptAsync(long receiptId, ConfirmGoodsReceiptDto dto, int staffId);
        Task<ReceiveGoodsFromPoResultDto> ReceiveGoodsFromPOAsync(long purchaseOrderId, List<ReceiveGoodsFromPoItemDto> items, int staffId);

        // Warehouse Card flow
        Task<List<WarehouseCardDto>> GetWarehouseCardsAsync(WarehouseCardQueryDto query);
        Task<List<WarehouseCardDto>> GetWarehouseCardsByMaterialAsync(int materialId);

        // QC Check flow
        Task<QCCheckDto> SubmitQCCheckAsync(long receiptId, SubmitQCCheckDto dto, int staffId);
        Task<QCCheckDto> GetQCCheckByReceiptAsync(long receiptId);

        // Incident Report flow
        Task<IncidentReportDto> CreateIncidentReportAsync(long receiptId, CreateIncidentReportDto dto, int staffId);
        Task<IncidentReportDto> GetIncidentReportByReceiptAsync(long receiptId);
        Task<List<IncidentReportSummaryDto>> GetAllIncidentReportsAsync();
    }
}