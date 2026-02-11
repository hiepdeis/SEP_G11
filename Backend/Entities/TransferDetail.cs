using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class TransferDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("TransferID")]
    public long TransferId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column("FromBinID")]
    public int? FromBinId { get; set; }

    [Column("ToBinID")]
    public int? ToBinId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? Quantity { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("TransferDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("FromBinId")]
    [InverseProperty("TransferDetailFromBins")]
    public virtual BinLocation? FromBin { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("TransferDetails")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("ToBinId")]
    [InverseProperty("TransferDetailToBins")]
    public virtual BinLocation? ToBin { get; set; }

    [ForeignKey("TransferId")]
    [InverseProperty("TransferDetails")]
    public virtual TransferOrder Transfer { get; set; } = null!;
}
