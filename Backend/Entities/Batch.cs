using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class Batch
{
    [Key]
    [Column("BatchID")]
    public int BatchId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string BatchCode { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime? MfgDate { get; set; }

    [Unicode(false)]
    public string? CertificateImage { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ExpiryDate { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedDate { get; set; }
    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();


    [InverseProperty("Batch")]
    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    [InverseProperty("Batch")]
    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    [InverseProperty("Batch")]
    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    [ForeignKey("MaterialId")]
    [InverseProperty("Batches")]
    public virtual Material Material { get; set; } = null!;

    [InverseProperty("Batch")]
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    [InverseProperty("Batch")]
    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    [InverseProperty("Batch")]
    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();

    [InverseProperty("Batch")]
    public virtual ICollection<WarehouseCard> WarehouseCards { get; set; } = new List<WarehouseCard>();

    [InverseProperty("Batch")]
    public virtual ICollection<ReceiptDetailBinAllocation> ReceiptDetailBinAllocations { get; set; } = new List<ReceiptDetailBinAllocation>();
    public virtual ICollection<PickingList> PickingLists { get; set; } = new List<PickingList>();
}
