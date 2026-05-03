using Backend.Domains.Audit.DTOs.Managers;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IStockTakeReviewService
    {
        Task<(List<AuditListItemDto> items, int total)> GetAllAuditsAsync(
            int skip,
            int take,
            int? stockTakeId,
            string? status,
            int? warehouseId,
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken ct);

        Task<AuditMetricsDto> GetMetricsAsync(int stockTakeId, CancellationToken ct);

        Task<(List<VarianceItemDto> items, int total, int unresolved)> GetVariancesAsync(
            int stockTakeId,
            int skip,
            int take,
            bool? resolved,
            CancellationToken ct);

        Task<(List<VarianceItemDto> items, int total, int unresolved)> GetVarianceDetailsAsync(
            int stockTakeId,
            bool? resolved,
            CancellationToken ct);

        Task<VarianceItemDto?> GetVarianceDetailAsync(
            int stockTakeId,
            long detailId,
            CancellationToken ct);

        Task<(bool success, string message)> ResolveVarianceAsync(
            int stockTakeId,
            long detailId,
            ResolveVarianceRequest request,
            int resolvedByUserId,
            CancellationToken ct);

        Task<(bool success, string message)> ResolveVariancesAsync(
            int stockTakeId,
            BulkResolveVarianceRequest request,
            int resolvedByUserId,
            CancellationToken ct);

        Task<(bool success, string message)> UpdateVarianceReasonAsync(
            int stockTakeId,
            long detailId,
            UpdateVarianceReasonRequest request,
            CancellationToken ct);

        Task<(bool success, string message)> RequestRecountAsync(
            int stockTakeId,
            long detailId,
            RequestRecountRequest request,
            int managerUserId,
            CancellationToken ct);

        /// <summary>Request recount for ALL pending discrepancy items (round 1) at once</summary>
        Task<(bool success, string message)> RequestRecountAllAsync(
            int stockTakeId,
            RequestRecountRequest request,
            int managerUserId,
            CancellationToken ct);

        /// <summary>Manager confirms all resolutions with a single signature → transitions to PendingAccountantApproval</summary>
        Task<(bool success, string message)> ManagerConfirmResolutionAsync(
            int stockTakeId,
            int managerUserId,
            string? signatureData,
            CancellationToken ct);

        Task<StockTakeReviewDetailDto> GetReviewDetailAsync(int stockTakeId, CancellationToken ct);

        Task<(bool success, string message, SignatureInfoDto? signature)> SignOffAsync(
            int stockTakeId,
            int userId,
            SignOffRequest request,
            CancellationToken ct);

        Task<(bool success, string message)> CompleteAuditAsync(
            int stockTakeId,
            int managerId,
            CompleteAuditRequest request,
            CancellationToken ct);

        // ===== NEW WORKFLOW METHODS =====
        
        /// <summary>Accountant reviews after staff finish: Approve (all matched) or ForwardToManager (has discrepancies)</summary>
        Task<(bool success, string message)> AccountantReviewAsync(
            int stockTakeId,
            int userId,
            string action,
            string? signatureData,
            CancellationToken ct);

        /// <summary>Accountant approves Manager's resolution → complete + update inventory</summary>
        Task<(bool success, string message)> AccountantApproveResolveAsync(
            int stockTakeId,
            int userId,
            string? signatureData,
            CancellationToken ct);

        /// <summary>Accountant rejects Manager's resolution → escalate to Admin</summary>
        Task<(bool success, string message)> AccountantRejectResolveAsync(
            int stockTakeId,
            int userId,
            string? notes,
            string? signatureData,
            CancellationToken ct);

        /// <summary>Admin issues penalty + signs → complete + update inventory</summary>
        Task<(bool success, string message)> AdminFinalizeAsync(
            int stockTakeId,
            int userId,
            AdminFinalizeRequest request,
            CancellationToken ct);
    }
}
