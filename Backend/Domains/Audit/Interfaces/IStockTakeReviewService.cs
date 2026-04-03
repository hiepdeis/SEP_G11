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
    }
}
