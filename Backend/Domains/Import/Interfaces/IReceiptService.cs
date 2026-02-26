using Backend.Domains.Import.DTOs;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Construction;
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

        /// <summary>
        /// Get list of receipts "REQUESTED" for accountant action
        /// </summary>
        Task<List<ReceiptSummaryDto>> GetReceiptsForAccountantReviewAsync();

        /// <summary>
        /// Get detail of a receipt by id
        /// </summary>
        Task<ReceiptDetailDto?> GetReceiptDetailForAccountantReviewAsync(long receiptId);

        /// <summary>
        /// Get list of suppliers that can provide materials for this receipt
        /// Based on SupplierQuotation table
        /// </summary>
        Task<List<MaterialSuppliersDto>> GetAvailableSuppliersAsync(long receiptId);

        /// <summary>
        /// create Draft for Receipt (Requested -> Draft)
        /// Accountant can choose supplier and fill in price
        /// </summary>
        Task CreateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId);

        /// <summary>
        /// Update Draft (to allow updating supplier/quantity/price)
        /// </summary>
        Task UpdateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId);

        /// <summary>
        /// Submit Draft for Manager approval (Draft -> Submitted)
        /// </summary>
        Task SubmitForApprovalAsync(long receiptId, int accountantId);

        // Manager Approval flow
        Task<List<PendingReceiptDto>> GetReceiptForManagerReviewAsync();
        Task ApproveReceiptAsync(long receiptId, int managerId, ApproveReceiptDto dto);
        Task RejectReceiptAsync(long receiptId, int managerId, RejectReceiptDto dto);
        Task<PendingReceiptDto> GetReceiptDetailForManagerReviewAsync(long receiptId);

        // Warehouse staff flow

        Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync();
        Task<GetInboundRequestListDto> GetReceiptDetailForWarehouseAsync(long receiptId);
        Task ConfirmGoodsReceiptAsync(long receiptId, ConfirmGoodsReceiptDto dto, int staffId);

    }
}