namespace Backend.Entities
{
    public partial class StockTakeSignature
    {
        public long SignatureId { get; set; }

        public int StockTakeId { get; set; }

        public int UserId { get; set; }

        public string Role { get; set; } = null!;

        public DateTime SignedAt { get; set; }

        public string? SignatureData { get; set; }

        public virtual StockTake StockTake { get; set; } = null!;

        public virtual User User { get; set; } = null!;
    }
}
