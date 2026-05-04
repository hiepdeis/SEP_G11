namespace Backend.Domains.Admin.Dtos
{
    public sealed class MasterDataQueryDto
    {
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 5000;

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
        public List<MasterDataContractDto> Contracts { get; set; } = new();
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
        public int? CurrentMaterialId { get; set; }
        public string? CurrentMaterialName { get; set; }
        public string? CurrentMaterialCode { get; set; }
        public decimal? MaxStockLevel { get; set; }
    }

    public sealed class UpsertBinLocationDto
    {
        public int WarehouseId { get; set; }
        public string Code { get; set; } = null!;
        public string? Type { get; set; }
        public int? CurrentMaterialId { get; set; }
        public decimal? MaxStockLevel { get; set; }
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
        public decimal? BudgetUsed { get; set; }
        public decimal? OverBudgetAllowance { get; set; }
        public string? Status { get; set; }
        public List<MasterDataContractDto> Contracts { get; set; } = new();
    }

    public sealed class UpsertProjectDto
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public decimal? BudgetUsed { get; set; }
        public decimal? OverBudgetAllowance { get; set; }
        public string? Status { get; set; }
    }

    public sealed class ProjectStatusUpdateDto
    {
        public string Status { get; set; } = null!;
    }

    public sealed class MasterDataContractDto
    {
        public long ContractId { get; set; }
        public string ContractCode { get; set; } = null!;
        public string? ContractNumber { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = null!;
        public bool IsActive { get; set; }
        public string? SupplierName { get; set; }
        public int PurchaseOrderCount { get; set; }
        public int MaterialCount { get; set; }
        public decimal? TotalAmount { get; set; }
        public List<MasterDataContractMaterialDto> Materials { get; set; } = new();
    }

    public sealed class MasterDataContractMaterialDto
    {
        public int MaterialId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Unit { get; set; }
        public decimal OrderedQuantity { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    // =========================
    // SUPPLIER CONTRACT
    // =========================

    public sealed class SupplierContractDto
    {
        public long ContractId { get; set; }
        public string ContractCode { get; set; } = null!;
        public string? ContractNumber { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public int? LeadTimeDays { get; set; }
        public string? PaymentTerms { get; set; }
        public string? DeliveryTerms { get; set; }
        public string Status { get; set; } = null!;
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    public sealed class UpsertSupplierContractDto
    {
        public string ContractCode { get; set; } = null!;
        public string? ContractNumber { get; set; }
        public int SupplierId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public int? LeadTimeDays { get; set; }
        public string? PaymentTerms { get; set; }
        public string? DeliveryTerms { get; set; }
        public string Status { get; set; } = null!;
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    // =========================
    // SUPPLIER QUOTATION
    // =========================

    public sealed class SupplierQuotationDto
    {
        public int QuoteId { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public int MaterialId { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public decimal Price { get; set; }
        public string? Currency { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool? IsActive { get; set; }
    }

    public sealed class UpsertSupplierQuotationDto
    {
        public int SupplierId { get; set; }
        public int MaterialId { get; set; }
        public decimal Price { get; set; }
        public string? Currency { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public bool? IsActive { get; set; } = true;
    }
}
