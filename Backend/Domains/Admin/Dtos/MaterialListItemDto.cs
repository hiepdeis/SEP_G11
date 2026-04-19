namespace Backend.Domains.Admin.Dtos
{
    public class MaterialListItemDto
    {
        public int MaterialId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Unit { get; set; } = null!;
        public decimal? MassPerUnit { get; set; }
        public decimal? MinStockLevel { get; set; }
        public decimal? MaxStockLevel { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? TechnicalStandard { get; set; }
        public string? Specification { get; set; }
        public bool IsDecimalUnit { get; set; }
        public decimal TotalOnHand { get; set; }
        public decimal TotalAllocated { get; set; }
        public decimal Available => TotalOnHand - TotalAllocated;
        public bool IsLowStock => MinStockLevel.HasValue && Available <= MinStockLevel.Value;
        public int? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public List<MaterialInventoryItemDto> Rows { get; set; } = new();
    }

    public sealed class MaterialDetailDto
    {
        public int MaterialId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Unit { get; set; } = null!;
        public decimal? MassPerUnit { get; set; }
        public decimal? MinStockLevel { get; set; }
        public decimal? MaxStockLevel { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? TechnicalStandard { get; set; }
        public string? Specification { get; set; }
        public bool IsDecimalUnit { get; set; }
        public decimal TotalOnHand { get; set; }
        public decimal TotalAllocated { get; set; }
        public decimal Available { get; set; }
    }

    public sealed class CreateMaterialRequest
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Unit { get; set; } = null!;
        public decimal? MassPerUnit { get; set; }
        public decimal? MinStockLevel { get; set; }
        public decimal? MaxStockLevel { get; set; }
        public int? CategoryId { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? TechnicalStandard { get; set; }
        public string? Specification { get; set; }
        public bool IsDecimalUnit { get; set; }
    }

    public sealed class UpdateMaterialRequest
    {
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Unit { get; set; } = null!;
        public decimal? MassPerUnit { get; set; }
        public decimal? MinStockLevel { get; set; }
        public decimal? MaxStockLevel { get; set; }
        public int? CategoryId { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? TechnicalStandard { get; set; }
        public string? Specification { get; set; }
        public bool IsDecimalUnit { get; set; }
    }

    public sealed class GetMaterialsQuery
    {
        public string? Search { get; set; }
        public int? CategoryId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 500;
    }

    public sealed class MaterialInventoryItemDto
    {
        public int Id { get; set; }

        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = null!;

        public int BinId { get; set; }
        public string BinCode { get; set; } = null!;
        public string? BinType { get; set; }

        public int BatchId { get; set; }
        public string BatchCode { get; set; } = null!;

        public decimal QuantityOnHand { get; set; }
        public decimal QuantityAllocated { get; set; }
        public decimal Available => QuantityOnHand - QuantityAllocated;
    }

    public sealed class CreateMaterialInventoryRequest
    {
        public int WarehouseId { get; set; }
        public int BinId { get; set; }
        public int? BatchId { get; set; }
        public string? BatchCode { get; set; }
        public decimal QuantityOnHand { get; set; }
        public decimal QuantityAllocated { get; set; }
    }

    public sealed class UpdateMaterialInventoryRequest
    {
        public int WarehouseId { get; set; }
        public int BinId { get; set; }
        public int? BatchId { get; set; }
        public string? BatchCode { get; set; }
        public decimal QuantityOnHand { get; set; }
        public decimal QuantityAllocated { get; set; }
    }
    public sealed class MaterialInventoryByWarehouseDto
    {
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = null!;
        public decimal TotalOnHand { get; set; }
        public decimal TotalAllocated { get; set; }
        public decimal Available => TotalOnHand - TotalAllocated;
        public List<MaterialInventoryItemDto> Rows { get; set; } = new();
    }
}