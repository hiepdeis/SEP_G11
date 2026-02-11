using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Batch
{
    public int BatchId { get; set; }

    public int MaterialId { get; set; }

    public string BatchCode { get; set; } = null!;

    public DateTime? MfgDate { get; set; }

    public string? CertificateImage { get; set; }

    public DateTime? CreatedDate { get; set; }

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    public virtual Material Material { get; set; } = null!;

    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();
}
