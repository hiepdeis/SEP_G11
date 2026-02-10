using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("ReceiptCode", Name = "UQ__Receipts__1AB76D000841B5BB", IsUnique = true)]
public partial class Receipt
{
    [Key]
    [Column("ReceiptID")]
    public long ReceiptId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string ReceiptCode { get; set; } = null!;

    [Column("SupplierID")]
    public int SupplierId { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ReceiptDate { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TotalAmount { get; set; }

    public int? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }


    [ForeignKey("CreatedBy")]
    [InverseProperty("Receipts")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("Receipt")]
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

 
    [ForeignKey("WarehouseId")]
    [InverseProperty("Receipts")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
