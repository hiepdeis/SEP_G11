using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class MaterialCategory
{
    public int CategoryId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Material> Materials { get; set; } = new List<Material>();
}
