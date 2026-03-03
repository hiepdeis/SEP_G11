using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("WarehouseCards")]
public partial class WarehouseCard
{
    [Key]
    [Column("CardID")]
    public long CardId { get; set; }

    [Required]
    [StringLength(50)]
    [Unicode(false)]
    public string CardCode { get; set; } = null!;

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BinID")]
    public int BinId { get; set; }

    [Column("BatchID")]
    public int BatchId { get; set; }

    // import, export, stocktake, loss, transfer
    [Required]
    [StringLength(20)]
    [Unicode(false)]
    public string TransactionType { get; set; } = null!;

    // ID của Receipt, IssueSlip, StockTake, LossReport, TransferOrder tương ứng với TransactionType
    [Column("ReferenceID")]
    public long ReferenceId { get; set; }

    // Receipt , IssueSlip, StockTake, LossReport, TransferOrder
    [Required]
    [StringLength(20)]
    [Unicode(false)]
    public string ReferenceType { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime TransactionDate { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal QuantityBefore { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal QuantityAfter { get; set; }

    public int CreatedBy { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
 
    // Navigation properties
    [ForeignKey("WarehouseId")]
    [InverseProperty("WarehouseCards")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("WarehouseCards")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("BinId")]
    [InverseProperty("WarehouseCards")]
    public virtual BinLocation Bin { get; set; } = null!;

    [ForeignKey("BatchId")]
    [InverseProperty("WarehouseCards")]
    public virtual Batch Batch { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    [InverseProperty("WarehouseCards")]
    public virtual User CreatedByNavigation { get; set; } = null!;
}