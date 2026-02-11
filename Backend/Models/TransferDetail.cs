using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class TransferDetail
{
    public long DetailId { get; set; }

    public long TransferId { get; set; }

    public int MaterialId { get; set; }

    public int? BatchId { get; set; }

    public int? FromBinId { get; set; }

    public int? ToBinId { get; set; }

    public decimal? Quantity { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual BinLocation? FromBin { get; set; }

    public virtual Material Material { get; set; } = null!;

    public virtual BinLocation? ToBin { get; set; }

    public virtual TransferOrder Transfer { get; set; } = null!;
}
