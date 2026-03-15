namespace Backend.Domains.Import.DTOs.Construction
{
    public class CreateImportRequestDto
    {
        public string? CreatedByName { get; set; }
        public DateTime? CreatedDate { get; set; }
        public List<ImportItemDto> Items { get; set; }
    }
}
