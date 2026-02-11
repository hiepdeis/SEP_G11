namespace Backend.Domains.Import.DTOs.Construction
{
    public class CreateImportRequestDto
    {
        public int WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public List<ImportItemDto> Items { get; set; }
    }
}
