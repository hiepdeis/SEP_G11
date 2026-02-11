using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Supplier
{
    public int SupplierId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? TaxCode { get; set; }

    public string? Address { get; set; }

    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    public virtual ICollection<SupplierQuotation> SupplierQuotations { get; set; } = new List<SupplierQuotation>();
}
