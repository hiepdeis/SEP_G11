using Backend.Domains.Admin.Dtos;

namespace Backend.Domains.Admin.Interface
{
    public interface IMaterialService
    {
        Task<PagedResult<MaterialListItemDto>> GetMaterialsAsync(GetMaterialsQuery query, CancellationToken ct);
        Task<MaterialDetailDto?> GetByIdAsync(int materialId, CancellationToken ct);
        Task<int> CreateAsync(CreateMaterialRequest request, CancellationToken ct);
        Task<bool> UpdateAsync(int materialId, UpdateMaterialRequest request, CancellationToken ct);
        Task<(bool success, string message)> DeleteAsync(int materialId, CancellationToken ct);

        Task<List<MaterialListItemDto>> GetInventoryByMaterialAsync(int materialId, CancellationToken ct);
        Task<int> CreateInventoryAsync(int materialId, CreateMaterialInventoryRequest request, CancellationToken ct);
        Task<bool> UpdateInventoryAsync(int materialId, int inventoryId, UpdateMaterialInventoryRequest request, CancellationToken ct);
        Task<(bool success, string message)> DeleteInventoryAsync(int materialId, int inventoryId, CancellationToken ct);
    }
}