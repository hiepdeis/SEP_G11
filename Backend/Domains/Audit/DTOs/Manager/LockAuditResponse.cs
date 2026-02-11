namespace Backend.Domains.Audit.DTOs.Manager
{
    public class LockAuditResponse
    {
        public int StockTakeId { get; set; }
        public string Status { get; set; } = "Locked";
        public DateTime LockedAt { get; set; }
        public int LockedBy { get; set; }
    }
}
