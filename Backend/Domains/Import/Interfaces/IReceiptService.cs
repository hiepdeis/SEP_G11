using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Construction;
using Backend.Domains.Import.DTOs.Constructions;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.DTOs.Staff;

namespace Backend.Domains.Import.Interfaces
{
    public interface IReceiptService
    {
        // Construction flow
        Task<long> CreateRequest(CreateImportRequestDto dto, int currentUserId);
        Task ImportFromExcelAsync(Stream fileStream, int warehouseId, int currentUserId);
        Task<List<CreateImportRequestDto>> GetMyRequestsAsync(int userId);

        // Accountant flow
        Task<List<ReceiptSummaryDto>> GetReceiptsForAccountantReviewAsync();
        Task<ReceiptDetailDto?> GetReceiptDetailForAccountantReviewAsync(long receiptId);
        Task<List<MaterialSuppliersDto>> GetAvailableSuppliersAsync(long receiptId);
        Task CreateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId);
        Task UpdateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId);
        Task SubmitForApprovalAsync(long receiptId, int accountantId);
        Task RevertToDraftAsync(long receiptId, int accountantId);
        Task<List<ReceiptRejectionHistoryDto>> GetRejectionHistoryAsync(long receiptId);

        // Manager Approval flow
        Task<List<PendingReceiptDto>> GetReceiptForManagerReviewAsync();
        Task ApproveReceiptAsync(long receiptId, int managerId, ApproveReceiptDto dto);
        Task RejectReceiptAsync(long receiptId, int managerId, RejectReceiptDto dto);
        Task<PendingReceiptDto> GetReceiptDetailForManagerReviewAsync(long receiptId);

        // Warehouse staff flow
        Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync();
        Task<GetInboundRequestListDto> GetReceiptDetailForWarehouseAsync(long receiptId);
        Task ConfirmGoodsReceiptAsync(long receiptId, ConfirmGoodsReceiptDto dto, int staffId);

        // Warehouse Card flow
        Task<List<WarehouseCardDto>> GetWarehouseCardsAsync(WarehouseCardQueryDto query);
        Task<List<WarehouseCardDto>> GetWarehouseCardsByMaterialAsync(int materialId);
    }
}