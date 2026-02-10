using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class LossDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("LossID")]
    public long LossId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column("BinID")]
    public int? BinId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [StringLength(255)]
    public string? Reason { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("LossDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("BinId")]
    [InverseProperty("LossDetails")]
    public virtual BinLocation? Bin { get; set; }

    [ForeignKey("LossId")]
    [InverseProperty("LossDetails")]
    public virtual LossReport Loss { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("LossDetails")]
    public virtual Material Material { get; set; } = null!;
}
