using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class LossReport
{
    public long LossId { get; set; }

    public string LossCode { get; set; } = null!;

    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? ReportDate { get; set; }

    public string? Type { get; set; }

    public string? Status { get; set; }

    public string? Description { get; set; }

    public virtual User? ApprovedByNavigation { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
