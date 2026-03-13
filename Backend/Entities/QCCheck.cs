using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("QCChecks")]
public partial class QCCheck
{
    [Key]
    [Column("QCCheckID")]
    public long QCCheckId { get; set; }

    [Required]
    [StringLength(50)]
    [Unicode(false)]
    public string QCCheckCode { get; set; } = null!;

    [Column("ReceiptID")]
    public long ReceiptId { get; set; }

    public int CheckedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CheckedAt { get; set; }

    /// <summary>"Pass" | "Fail"</summary>
    [Required]
    [StringLength(10)]
    [Unicode(false)]
    public string OverallResult { get; set; } = null!;

    [StringLength(1000)]
    public string? Notes { get; set; }

    // Navigation properties
    [ForeignKey("ReceiptId")]
    [InverseProperty("QCChecks")]
    public virtual Receipt Receipt { get; set; } = null!;

    [ForeignKey("CheckedBy")]
    [InverseProperty("QCChecks")]
    public virtual User CheckedByNavigation { get; set; } = null!;

    [InverseProperty("QCCheck")]
    public virtual ICollection<QCCheckDetail> QCCheckDetails { get; set; } = new List<QCCheckDetail>();

    [InverseProperty("QCCheck")]
    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();
}
