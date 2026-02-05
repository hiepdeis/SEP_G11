using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class IssueSlip
{
    public long IssueId { get; set; }

    public string IssueCode { get; set; } = null!;

    public int? ProjectId { get; set; }

    public int? WarehouseId { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? IssueDate { get; set; }

    public string? Status { get; set; }

    public string? Description { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    public virtual Project? Project { get; set; }

    public virtual Warehouse? Warehouse { get; set; }
}
