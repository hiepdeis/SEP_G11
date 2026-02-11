using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class IssueSlip
{
    public long IssueId { get; set; }

    public string IssueCode { get; set; } = null!;

    public int ProjectId { get; set; }

    public int? WarehouseId { get; set; }

    public long? ParentIssueId { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? IssueDate { get; set; }

    public string? Status { get; set; }

    public string? Description { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<IssueSlip> InverseParentIssue { get; set; } = new List<IssueSlip>();

    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    public virtual IssueSlip? ParentIssue { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual Warehouse? Warehouse { get; set; }
}
