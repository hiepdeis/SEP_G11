using System;

namespace Backend.Entities
{
    public partial class ReceiptSignature
    {
        public long SignatureId { get; set; }

        public long ReceiptId { get; set; }

        public int UserId { get; set; }

        public string Role { get; set; } = null!;

        public DateTime SignedAt { get; set; }

        public string? SignatureData { get; set; }

        public virtual Receipt Receipt { get; set; } = null!;

        public virtual User User { get; set; } = null!;
    }
}
