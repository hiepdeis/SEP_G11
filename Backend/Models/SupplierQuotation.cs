using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class SupplierQuotation
{
    public int QuoteId { get; set; }

    public int? SupplierId { get; set; }

    public int? MaterialId { get; set; }

    public decimal? Price { get; set; }

    public string? Currency { get; set; }

    public DateTime? ValidFrom { get; set; }

    public DateTime? ValidTo { get; set; }

    public bool? IsActive { get; set; }

    public virtual Material? Material { get; set; }

    public virtual Supplier? Supplier { get; set; }
}
