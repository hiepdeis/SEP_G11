using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public class IncidentEvidenceImage
{
    [Key]
    public long Id { get; set; }

    [Column("IncidentReportDetailID")]
    public long IncidentReportDetailId { get; set; }

    [Required]
    public string ImageData { get; set; } = string.Empty;

    [Column(TypeName = "datetime")]
    public DateTime UploadedAt { get; set; }

    public int UploadedByStaffId { get; set; }

    [ForeignKey("IncidentReportDetailId")]
    [InverseProperty("EvidenceImages")]
    public virtual IncidentReportDetail IncidentReportDetail { get; set; } = null!;
}
