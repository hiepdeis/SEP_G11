using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("LossCode", Name = "UQ__LossRepo__B9216BF629D331BF", IsUnique = true)]
public partial class LossReport
{
    [Key]
    [Column("LossID")]
    public long LossId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string LossCode { get; set; } = null!;

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public int? ApprovedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ReportDate { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Type { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }

    [ForeignKey("ApprovedBy")]
    [InverseProperty("LossReportApprovedByNavigations")]
    public virtual User? ApprovedByNavigation { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("LossReportCreatedByNavigations")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("Loss")]
    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("LossReports")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
