namespace Backend.Domains.Admin.Dtos
{
    public sealed class MasterDataQueryDto
    {
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public bool? IsActive { get; set; }
        public int? WarehouseId { get; set; }
        public string? Type { get; set; }
        public string? Status { get; set; }
    }

    public sealed class MasterDataPagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    public sealed class MasterDataLookupDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
    }

    // =========================
    // ROLES
    // =========================
    public sealed class RoleAdminDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;
    }

    public sealed class UpsertRoleDto
    {
        public string RoleName { get; set; } = null!;
    }

    // =========================
    // MATERIAL CATEGORIES
    // =========================
    public sealed class MaterialCategoryDto
    {
        public int CategoryId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }

    public sealed class UpsertMaterialCategoryDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }

    // =========================
    // ADJUSTMENT REASONS
    // =========================
    public sealed class AdjustmentReasonDto
    {
        public int ReasonId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    public sealed class UpsertAdjustmentReasonDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public sealed class MasterDataStatusDto
    {
        public bool IsActive { get; set; }
    }

    // =========================
    // SUPPLIERS
    // =========================
    public sealed class SupplierDto
    {
        public int SupplierId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? TaxCode { get; set; }
        public string? Address { get; set; }
    }

    public sealed class UpsertSupplierDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? TaxCode { get; set; }
        public string? Address { get; set; }
    }

    // =========================
    // WAREHOUSES
    // =========================
    public sealed class WarehouseDto
    {
        public int WarehouseId { get; set; }
        public string Name { get; set; } = null!;
        public string? Address { get; set; }
        public int BinCount { get; set; }
    }

    public sealed class UpsertWarehouseDto
    {
        public string Name { get; set; } = null!;
        public string? Address { get; set; }
    }

    // =========================
    // BIN LOCATIONS
    // =========================
    public sealed class BinLocationDto
    {
        public int BinId { get; set; }
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = null!;
        public string Code { get; set; } = null!;
        public string? Type { get; set; }
    }

    public sealed class UpsertBinLocationDto
    {
        public int WarehouseId { get; set; }
        public string Code { get; set; } = null!;
        public string? Type { get; set; }
    }

    // =========================
    // PROJECTS
    // =========================
    public sealed class ProjectDto
    {
        public int ProjectId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Status { get; set; }
    }

    public sealed class UpsertProjectDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Status { get; set; }
    }

    public sealed class ProjectStatusUpdateDto
    {
        public string Status { get; set; } = null!;
    }
}