using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class StockTakeDetail
{
    public long Id { get; set; }

    public int? StockTakeId { get; set; }

    public int? MaterialId { get; set; }

    public int? BatchId { get; set; }

    public decimal? SystemQty { get; set; }

    public decimal? CountQty { get; set; }

    public decimal? Variance { get; set; }

    public string? Reason { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual Material? Material { get; set; }

    public virtual StockTake? StockTake { get; set; }
}
