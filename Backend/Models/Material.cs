using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Material
{
    public int MaterialId { get; set; }

    public string Code { get; set; } = null!;

    public string? Name { get; set; }

    public string? Unit { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? MassPerUnit { get; set; }

    public int? MinStockLevel { get; set; }

    public int? CategoryId { get; set; }

    public virtual MaterialCategory? Category { get; set; } // Navigation


    public virtual ICollection<Batch> Batches { get; set; } = new List<Batch>();

    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<SupplierQuotation> SupplierQuotations { get; set; } = new List<SupplierQuotation>();

    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();
}
