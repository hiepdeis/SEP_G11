using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public class ReceiptDetailBinAllocation
{
    [Key]
    public long Id { get; set; }

    [Column("ReceiptDetailID")]
    public long ReceiptDetailId { get; set; }

    [Column("BinID")]
    public int BinId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [Column("BatchID")]
    public int BatchId { get; set; }

    [ForeignKey("ReceiptDetailId")]
    [InverseProperty("BinAllocations")]
    public virtual ReceiptDetail ReceiptDetail { get; set; } = null!;

    [ForeignKey("BinId")]
    [InverseProperty("ReceiptDetailBinAllocations")]
    public virtual BinLocation Bin { get; set; } = null!;

    [ForeignKey("BatchId")]
    [InverseProperty("ReceiptDetailBinAllocations")]
    public virtual Batch Batch { get; set; } = null!;
}
