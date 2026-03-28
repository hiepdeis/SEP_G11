namespace Backend.Domains.Audit.DTOs.Staffs;

public sealed class CountingDto
{
    public int MaterialId { get; set; }
    public int BinId { get; set; }
    public int BatchId { get; set; }

    public string? MaterialName { get; set; }
    public string? BatchCode { get; set; }
    public string? BinCode { get; set; }
    public string? UnitName { get; set; }

    public decimal? SystemQty { get; set; }
    public decimal? CountQty { get; set; }
    public int CountRound { get; set; }
    public decimal? Variance { get; set; }

    public int? CountedBy { get; set; }
    public DateTime? CountedAt { get; set; }
}

public sealed class UpsertCountRequest
{
    public int MaterialId { get; set; }
    public string BinCode { get; set; } = null!;
    public string BatchCode { get; set; } = null!;
    public decimal CountQty { get; set; }
}

public sealed class MaterialSuggestDto
{
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = null!;
    public string? BatchCode { get; set; }
    public string? UnitName { get; set; }
}
public sealed class MaterialBatchDto
{
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = null!;

    public int BinId { get; set; }
    public string? BinCode { get; set; }

    public int BatchId { get; set; }
    public string BatchCode { get; set; } = null!;
}
