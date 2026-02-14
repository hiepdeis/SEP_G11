namespace Backend.Domains.Import.DTOs.Staff
{
    public class ConfirmGoodsReceiptDto
    {
        public List<ConfirmGoodsReceiptItemDto> Items { get; set; } = new List<ConfirmGoodsReceiptItemDto>();
        public string? Notes { get; set; }
    }

    public class ConfirmGoodsReceiptItemDto
    {
        public long DetailId { get; set; }           // ReceiptDetail ID
        public decimal ActualQuantity { get; set; }  // Số lượng thực nhận
        public int BinLocationId { get; set; }       // Vị trí kho
        public string? BatchCode { get; set; }       // Batch code (optional, can create new)
        public DateTime? MfgDate { get; set; }       // Ngày sản xuất (for new batch)
        public string? CertificateImage { get; set; } // Certificate URL (for new batch)
    }
}
