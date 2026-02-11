
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public partial class StockTake
{
    [Key]
    [Column("StockTakeID")]
    public int StockTakeId { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CheckDate { get; set; }

    public int CreatedBy { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("StockTakes")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("StockTake")]
    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("StockTakes")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}