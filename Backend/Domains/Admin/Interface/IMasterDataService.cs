using Backend.Domains.Admin.Dtos;

namespace Backend.Domains.Admin.Interface
{
    public interface IMasterDataService
    { // Roles
        Task<MasterDataPagedResult<RoleAdminDto>> GetRolesAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<RoleAdminDto?> GetRoleByIdAsync(int id, CancellationToken ct);
        Task<int> CreateRoleAsync(UpsertRoleDto request, CancellationToken ct);
        Task<bool> UpdateRoleAsync(int id, UpsertRoleDto request, CancellationToken ct);
        Task<bool> DeleteRoleAsync(int id, CancellationToken ct);

        // Material Categories
        Task<MasterDataPagedResult<MaterialCategoryDto>> GetCategoriesAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<MaterialCategoryDto?> GetCategoryByIdAsync(int id, CancellationToken ct);
        Task<int> CreateCategoryAsync(UpsertMaterialCategoryDto request, CancellationToken ct);
        Task<bool> UpdateCategoryAsync(int id, UpsertMaterialCategoryDto request, CancellationToken ct);
        Task<bool> DeleteCategoryAsync(int id, CancellationToken ct);

        // Adjustment Reasons
        Task<MasterDataPagedResult<AdjustmentReasonDto>> GetAdjustmentReasonsAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<AdjustmentReasonDto?> GetAdjustmentReasonByIdAsync(int id, CancellationToken ct);
        Task<int> CreateAdjustmentReasonAsync(UpsertAdjustmentReasonDto request, CancellationToken ct);
        Task<bool> UpdateAdjustmentReasonAsync(int id, UpsertAdjustmentReasonDto request, CancellationToken ct);
        Task<bool> UpdateAdjustmentReasonStatusAsync(int id, MasterDataStatusDto request, CancellationToken ct);
        Task<bool> DeleteAdjustmentReasonAsync(int id, CancellationToken ct);

        // Suppliers
        Task<MasterDataPagedResult<SupplierDto>> GetSuppliersAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<SupplierDto?> GetSupplierByIdAsync(int id, CancellationToken ct);
        Task<int> CreateSupplierAsync(UpsertSupplierDto request, CancellationToken ct);
        Task<bool> UpdateSupplierAsync(int id, UpsertSupplierDto request, CancellationToken ct);
        Task<bool> DeleteSupplierAsync(int id, CancellationToken ct);

        // Warehouses
        Task<MasterDataPagedResult<WarehouseDto>> GetWarehousesAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<WarehouseDto?> GetWarehouseByIdAsync(int id, CancellationToken ct);
        Task<int> CreateWarehouseAsync(UpsertWarehouseDto request, CancellationToken ct);
        Task<bool> UpdateWarehouseAsync(int id, UpsertWarehouseDto request, CancellationToken ct);
        Task<bool> DeleteWarehouseAsync(int id, CancellationToken ct);
        Task<List<MasterDataLookupDto>> GetWarehouseLookupAsync(CancellationToken ct);

        // Bin Locations
        Task<MasterDataPagedResult<BinLocationDto>> GetBinLocationsAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<BinLocationDto?> GetBinLocationByIdAsync(int id, CancellationToken ct);
        Task<int> CreateBinLocationAsync(UpsertBinLocationDto request, CancellationToken ct);
        Task<bool> UpdateBinLocationAsync(int id, UpsertBinLocationDto request, CancellationToken ct);
        Task<bool> DeleteBinLocationAsync(int id, CancellationToken ct);

        // Projects
        Task<MasterDataPagedResult<ProjectDto>> GetProjectsAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<ProjectDto?> GetProjectByIdAsync(int id, CancellationToken ct);
        Task<int> CreateProjectAsync(UpsertProjectDto request, CancellationToken ct);
        Task<bool> UpdateProjectAsync(int id, UpsertProjectDto request, CancellationToken ct);
        Task<bool> UpdateProjectStatusAsync(int id, ProjectStatusUpdateDto request, CancellationToken ct);
        Task<bool> DeleteProjectAsync(int id, CancellationToken ct);

        // Supplier Contracts
        Task<MasterDataPagedResult<SupplierContractDto>> GetSupplierContractsAsync(MasterDataQueryDto query, CancellationToken ct);
        Task<SupplierContractDto?> GetSupplierContractByIdAsync(int id, CancellationToken ct);
        Task<int> CreateSupplierContractAsync(UpsertSupplierContractDto request, CancellationToken ct);
        Task<bool> UpdateSupplierContractAsync(int id, UpsertSupplierContractDto request, CancellationToken ct);
        Task<bool> DeleteSupplierContractAsync(int id, CancellationToken ct);
        Task<List<SupplierContractDto>> GetSupplierContractsBySupplierIdAsync(int supplierId, CancellationToken ct);
    
    }
}