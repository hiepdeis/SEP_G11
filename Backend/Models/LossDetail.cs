using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class LossDetail
{
    public long DetailId { get; set; }

    public long LossId { get; set; }

    public int MaterialId { get; set; }

    public int? BatchId { get; set; }

    public int? BinId { get; set; }

    public decimal Quantity { get; set; }

    public string? Reason { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual BinLocation? Bin { get; set; }

    public virtual LossReport Loss { get; set; } = null!;

    public virtual Material Material { get; set; } = null!;
}
