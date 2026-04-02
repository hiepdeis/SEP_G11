using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("IncidentReportDetails")]
public partial class IncidentReportDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("IncidentID")]
    public long IncidentId { get; set; }

    [Column("ReceiptDetailID")]
    public long ReceiptDetailId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal ExpectedQuantity { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal ActualQuantity { get; set; }

    /// <summary>"Quantity" | "Quality" | "Damage"</summary>
    [Required]
    [StringLength(20)]
    [Unicode(false)]
    public string IssueType { get; set; } = null!;

    [StringLength(1000)]
    public string? Notes { get; set; }

    [InverseProperty("IncidentReportDetail")]
    public virtual ICollection<IncidentEvidenceImage> EvidenceImages { get; set; } = new List<IncidentEvidenceImage>();

    // Navigation properties
    [ForeignKey("IncidentId")]
    [InverseProperty("IncidentReportDetails")]
    public virtual IncidentReport IncidentReport { get; set; } = null!;

    [ForeignKey("ReceiptDetailId")]
    [InverseProperty("IncidentReportDetails")]
    public virtual ReceiptDetail ReceiptDetail { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("IncidentReportDetails")]
    public virtual Material Material { get; set; } = null!;
}
