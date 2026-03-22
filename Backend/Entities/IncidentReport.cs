using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("IncidentReports")]
public partial class IncidentReport
{
    [Key]
    [Column("IncidentID")]
    public long IncidentId { get; set; }

    [Required]
    [StringLength(50)]
    [Unicode(false)]
    public string IncidentCode { get; set; } = null!;

    [Column("ReceiptID")]
    public long ReceiptId { get; set; }

    /// <summary>Liên kết với QCCheck nếu phát sinh từ QC fail (nullable — có thể lập độc lập)</summary>
    [Column("QCCheckID")]
    public long? QCCheckId { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [StringLength(2000)]
    public string Description { get; set; } = null!;

    /// <summary>"Open" | "PendingManagerReview" | "PendingPurchasingAction" | "PendingManagerApproval" | "AwaitingSupplementaryGoods" | "Resolved"</summary>
    [Required]
    [StringLength(20)]
    [Unicode(false)]
    public string Status { get; set; } = "Open";

    [StringLength(2000)]
    public string? Resolution { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ResolvedAt { get; set; }

    public int? ResolvedBy { get; set; }

    // Navigation properties
    [ForeignKey("ReceiptId")]
    [InverseProperty("IncidentReports")]
    public virtual Receipt Receipt { get; set; } = null!;

    [ForeignKey("QCCheckId")]
    [InverseProperty("IncidentReports")]
    public virtual QCCheck? QCCheck { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("IncidentReportsCreated")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [ForeignKey("ResolvedBy")]
    [InverseProperty("IncidentReportsResolved")]
    public virtual User? ResolvedByNavigation { get; set; }

    [InverseProperty("IncidentReport")]
    public virtual ICollection<IncidentReportDetail> IncidentReportDetails { get; set; } = new List<IncidentReportDetail>();

    [InverseProperty("IncidentReport")]
    public virtual ICollection<SupplementaryReceipt> SupplementaryReceipts { get; set; } = new List<SupplementaryReceipt>();
}
