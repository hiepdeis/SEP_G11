using System.Collections.Generic;

namespace Backend.Domains.Audit.DTOs.Staff;

public class ActiveAuditDetailsResponse
{
    public int StockTakeId { get; set; }
    public int WarehouseId { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "InProcess";

    public int TotalLines { get; set; }
    public int CountedLines { get; set; }
    public int ProgressPercent { get; set; }

    public List<StockTakeDetailForCountResponse> Details { get; set; } = new();
}
