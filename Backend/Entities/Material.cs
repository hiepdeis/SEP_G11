using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("Code", Name = "UQ__Material__A25C5AA759901DD0", IsUnique = true)]
public partial class Material
{
    [Key]
    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Code { get; set; } = null!;

    [StringLength(255)]
    public string Name { get; set; } = null!;

    [StringLength(20)]
    public string? Unit { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? MassPerUnit { get; set; }

    public int? MinStockLevel { get; set; }
    public int? CategoryId { get; set; }
    public decimal? UnitPrice { get; set; }

    public string? TechnicalStandard { get; set; } // Tiêu chuẩn kỹ thuật (VD: TCVN, ASTM)
    public string? Specification { get; set; }    // Quy cách (VD: L=6000mm, D=20mm)
    public virtual MaterialCategory? Category { get; set; } // Navigation

    [InverseProperty("Material")]
    public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();
    [InverseProperty("Material")]
    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    [InverseProperty("Material")]
    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    [InverseProperty("Material")]
    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    [InverseProperty("Material")]
    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    [InverseProperty("Material")]
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    [InverseProperty("Material")]
    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    [InverseProperty("Material")]
    public virtual ICollection<SupplierQuotation> SupplierQuotations { get; set; } = new List<SupplierQuotation>();

    [InverseProperty("Material")]
    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();

    [InverseProperty("Material")]
    public virtual ICollection<WarehouseCard> WarehouseCards { get; set; } = new List<WarehouseCard>();

    [InverseProperty("Material")]
    public virtual ICollection<IncidentReportDetail> IncidentReportDetails { get; set; } = new List<IncidentReportDetail>();

}
