using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public class ReceiptRejectionHistory
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long ReceiptId { get; set; }

    [Required]
    public int RejectedBy { get; set; }

    [Required]
    public DateTime RejectedAt { get; set; }

    [Required]
    public string RejectionReason { get; set; } = string.Empty;

    // Navigation properties
    [ForeignKey("ReceiptId")]
    public virtual Receipt Receipt { get; set; } = null!;

    [ForeignKey("RejectedBy")]
    public virtual User Rejector { get; set; } = null!;
}
