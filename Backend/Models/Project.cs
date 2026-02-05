using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Project
{
    public int ProjectId { get; set; }

    public string Code { get; set; } = null!;

    public string? Name { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public decimal? Budget { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();
}
