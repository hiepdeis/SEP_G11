namespace Backend.Domains.Audit.DTOs.Staffs
{
    public sealed class CountItemStaffDto
    {
        public int MaterialId { get; set; }
        public int BinId { get; set; }
        public int BatchId { get; set; }

        public string? MaterialName { get; set; }
        public string BatchCode { get; set; } = null!; // Staff đọc từ tag
        public string? BinCode { get; set; }

        public decimal? CountQty { get; set; }
        public int? CountedBy { get; set; }
        public DateTime? CountedAt { get; set; }
    }

}
