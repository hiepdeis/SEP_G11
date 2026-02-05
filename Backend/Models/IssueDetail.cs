using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class IssueDetail
{
    public long DetailId { get; set; }

    public long? IssueId { get; set; }

    public int? MaterialId { get; set; }

    public int? BatchId { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual IssueSlip? Issue { get; set; }

    public virtual Material? Material { get; set; }
}
