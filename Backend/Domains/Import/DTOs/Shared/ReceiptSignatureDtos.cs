using System;
using System.Collections.Generic;

namespace Backend.Domains.Import.DTOs.Shared
{
    public sealed class ReceiptSignatureDto
    {
        public long ReceiptId { get; set; }
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public string Role { get; set; } = string.Empty;
        public DateTime? SignedAt { get; set; }
        public string? SignatureData { get; set; }
    }

    public sealed class ReceiptSignatureListDto
    {
        public long ReceiptId { get; set; }
        public List<ReceiptSignatureDto> Signatures { get; set; } = new();
    }
}
