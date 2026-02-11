using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class StockTakeDetail
{
    [Key]
    [Column("ID")]
    public long Id { get; set; }

    [Column("StockTakeID")]
    public int StockTakeId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? SystemQty { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? CountQty { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? Variance { get; set; }

    [StringLength(255)]
    public string? Reason { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("StockTakeDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("StockTakeDetails")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("StockTakeId")]
    [InverseProperty("StockTakeDetails")]
    public virtual StockTake StockTake { get; set; } = null!;
}
