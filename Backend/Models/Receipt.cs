using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Receipt
{
    public long ReceiptId { get; set; }

    public string ReceiptCode { get; set; } = null!;

    public int SupplierId { get; set; }

    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? ReceiptDate { get; set; }

    public string? Status { get; set; }

    public decimal? TotalAmount { get; set; }

    public int? SubmittedBy { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? Notes { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
