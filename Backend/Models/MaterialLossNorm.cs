using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class MaterialLossNorm
{
    public int NormId { get; set; }

    public int? MaterialId { get; set; }

    public int? ProjectId { get; set; }

    public decimal? LossPercentage { get; set; }

    public DateTime? EffectiveDate { get; set; }

    public string? Description { get; set; }

    public int? CreatedBy { get; set; }

    public bool? IsActive { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Material? Material { get; set; }

    public virtual Project? Project { get; set; }
}
