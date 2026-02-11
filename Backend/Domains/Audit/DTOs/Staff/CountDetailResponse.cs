using System;

namespace Backend.Domains.Audit.DTOs;

public class CountDetailResponse
{
    public long Id { get; set; }   // ✅ đổi
    public int StockTakeId { get; set; }

    public decimal CountQty { get; set; }
    public decimal Variance { get; set; }
    public string LineStatus { get; set; } = "Counted";

    public int CountedBy { get; set; }
    public DateTime CountedAt { get; set; }
}
