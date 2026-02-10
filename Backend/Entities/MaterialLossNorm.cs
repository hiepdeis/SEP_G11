using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class MaterialLossNorm
{
    [Key]
    [Column("NormID")]
    public int NormId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("ProjectID")]
    public int? ProjectId { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? LossPercentage { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? EffectiveDate { get; set; }

    [StringLength(255)]
    public string? Description { get; set; }

    public int? CreatedBy { get; set; }

    public bool? IsActive { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("MaterialLossNorms")]
    public virtual User? CreatedByNavigation { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("MaterialLossNorms")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("ProjectId")]
    [InverseProperty("MaterialLossNorms")]
    public virtual Project? Project { get; set; }
}
