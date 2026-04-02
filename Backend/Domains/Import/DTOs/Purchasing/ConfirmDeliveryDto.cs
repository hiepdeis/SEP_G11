namespace Backend.Domains.Import.DTOs.Purchasing
{
    public class ConfirmDeliveryDto
    {
        public DateTime ExpectedDeliveryDate { get; set; }
        public string? SupplierNote { get; set; }
    }
}
