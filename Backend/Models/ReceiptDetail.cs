using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class ReceiptDetail
{
    public long DetailId { get; set; }

    public long? ReceiptId { get; set; }

    public int? MaterialId { get; set; }

    public int? SupplierId { get; set; }

    public int? BatchId { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? LineTotal { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual Material? Material { get; set; }

    public virtual Receipt? Receipt { get; set; }

    public virtual Supplier? Supplier { get; set; }

}
