namespace Backend.Domains.Import.DTOs.Accountants
{
    public class PriceReviewItemDto
    {
        public string MaterialName { get; set; } = string.Empty;
        public decimal PoUnitPrice { get; set; }
        public decimal QuotationPrice { get; set; }
        public decimal Variance { get; set; }
        public decimal? VariancePercent { get; set; }
    }
}
