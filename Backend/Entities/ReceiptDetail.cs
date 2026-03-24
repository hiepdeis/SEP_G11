using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class ReceiptDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("ReceiptID")]
    public long ReceiptId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    public int? SupplierId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? UnitPrice { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? LineTotal { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? ActualQuantity { get; set; }

    [Column("BinLocationID")]
    public int? BinLocationId { get; set; }



    [ForeignKey("BatchId")]
    [InverseProperty("ReceiptDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("BinLocationId")]
    [InverseProperty("ReceiptDetails")]
    public virtual BinLocation? BinLocation { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("ReceiptDetails")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("ReceiptId")]
    [InverseProperty("ReceiptDetails")]
    public virtual Receipt Receipt { get; set; } = null!;

    public virtual Supplier? Supplier { get; set; }

    [InverseProperty("ReceiptDetail")]
    public virtual ICollection<QCCheckDetail> QCCheckDetails { get; set; } = new List<QCCheckDetail>();

    [InverseProperty("ReceiptDetail")]
    public virtual ICollection<IncidentReportDetail> IncidentReportDetails { get; set; } = new List<IncidentReportDetail>();

    [InverseProperty("ReceiptDetail")]
    public virtual ICollection<ReceiptDetailBinAllocation> BinAllocations { get; set; } = new List<ReceiptDetailBinAllocation>();
}
