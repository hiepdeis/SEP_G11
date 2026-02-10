namespace Backend.Domains.Import.DTOs.Accountants
{
    public class MaterialSuppliersDto
    {
        public int MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public List<SupplierQuotationDto> Suppliers { get; set; } = new();
    }
}
