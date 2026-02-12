namespace Backend.Domains.Audit.DTOs.Staffs;

public sealed class CountItemDto
{
    public int MaterialId { get; set; }
    public int BinId { get; set; }
    public int BatchId { get; set; }

    public string? MaterialName { get; set; }   // nếu Material entity khác tên field thì sửa
    public string? BatchCode { get; set; }      // nếu Batch entity khác tên field thì sửa
    public string? BinCode { get; set; }        // nếu BinLocation entity khác tên field thì sửa

    public decimal? SystemQty { get; set; }
    public decimal? CountQty { get; set; }
    public decimal? Variance { get; set; }

    public int? CountedBy { get; set; }
    public DateTime? CountedAt { get; set; }
}

public sealed class UpsertCountRequest
{
    public int MaterialId { get; set; }
    // Accept BinCode from staff (scanned/entered) instead of BinId
    public string BinCode { get; set; } = null!;
    public string BatchCode { get; set; } = null!; // Staff đọc từ tag
    public decimal CountQty { get; set; }
    public string? Reason { get; set; }
}
