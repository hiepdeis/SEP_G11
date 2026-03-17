using Backend.Domains.Audit.DTOs.Staffs;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IStockTakeCountingService
    {
        Task<bool> IsTeamMemberAsync(int stockTakeId, int userId, CancellationToken ct);

        Task<List<CountingDto>> GetCountItemsAsync(
            int stockTakeId,
            int userId,
            string? keyword,
            bool uncountedOnly,
            int skip,
            int take,
            CancellationToken ct);

        Task<List<MaterialSuggestDto>> SuggestMaterialsAsync(
            int stockTakeId,
            int userId,
            string? keyword,
            int take,
            CancellationToken ct);

        Task<(bool success, string message)> UpsertCountAsync(
            int stockTakeId,
            int userId,
            UpsertCountRequest request,
            CancellationToken ct);

        Task<List<CountingDto>> GetRecountItemsAsync(
            int stockTakeId,
            int userId,
            string? keyword,
            int skip,
            int take,
            CancellationToken ct);

        Task<(bool success, string message)> RecountAsync(
            int stockTakeId,
            int userId,
            UpsertCountRequest request,
            CancellationToken ct);
    }
}