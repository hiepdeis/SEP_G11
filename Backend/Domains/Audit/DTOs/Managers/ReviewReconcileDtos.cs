namespace Backend.Domains.Audit.DTOs.Managers;

public sealed class AuditMetricsDto
{
    public int StockTakeId { get; set; }
    public string? Title { get; set; }
    public string? Status { get; set; }

    // === Lo?i v?t li?u (SKU) ===
    public int TotalMaterials { get; set; }      // T?ng lo?i v?t li?u trong kho
    public int CountedMaterials { get; set; }    // Lo?i v?t li?u ?ã ??m ???c
    public int UncountedMaterials { get; set; }  // Lo?i v?t li?u ch?a ??m

    // === S? l??ng items ===
    public int TotalItems { get; set; }
    public int CountedItems { get; set; }
    public int UncountedItems { get; set; }
    public int MatchedItems { get; set; }
    public int DiscrepancyItems { get; set; }

    // === Chênh l?ch (Variance) ===
    public decimal TotalSystemQty { get; set; }     // T?ng s? l??ng theo h? th?ng
    public decimal TotalCountedQty { get; set; }    // T?ng s? l??ng ??m ???c
    public decimal TotalVarianceQty { get; set; }   // T?ng chênh l?ch = |SystemQty - CountedQty|
    public decimal VariancePercentage { get; set; } // % chênh l?ch = (Variance / SystemQty) * 100

    // === T? l? ===
    public decimal MaterialCountRate { get; set; }  // % lo?i v?t li?u ??m ???c
    public decimal MatchRate { get; set; }          // % trùng kh?p
}

public sealed class VarianceItemDto
{
    public long Id { get; set; }
    public int MaterialId { get; set; }
    public string? MaterialName { get; set; }
    public int BinId { get; set; }
    public string? BinCode { get; set; }
    public int? BatchId { get; set; }
    public string? BatchCode { get; set; }

    public decimal? SystemQty { get; set; }
    public decimal? CountQty { get; set; }
    public decimal? Variance { get; set; }
    public string? DiscrepancyStatus { get; set; }

    public int? CountedBy { get; set; }
    public string? CountedByName { get; set; }
    public DateTime? CountedAt { get; set; }

    public string? Reason { get; set; }
    public string? ResolutionAction { get; set; }
    public int? AdjustmentReasonId { get; set; }
    public string? AdjustmentReasonName { get; set; }
    public int? ResolvedBy { get; set; }
    public string? ResolvedByName { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public sealed class ResolveVarianceRequest
{
    public long DetailId { get; set; }
    public string? ResolutionAction { get; set; } // e.g., "Accept", "AdjustSystem", "Investigate"
    public int? AdjustmentReasonId { get; set; }
    public string? Notes { get; set; }
}

public sealed class SignOffRequest
{
    public int StockTakeId { get; set; }
    public string? Notes { get; set; }
}

public sealed class CompleteAuditRequest
{
    public int StockTakeId { get; set; }
    public string? Notes { get; set; }
}

public sealed class TeamMemberDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public DateTime? AssignedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsActive { get; set; }
}

public sealed class VarianceSummaryDto
{
    public int TotalVariances { get; set; }
    public int ResolvedVariances { get; set; }
    public int UnresolvedVariances { get; set; }
    public decimal ResolutionRate { get; set; } // Resolved / Total * 100
}

public sealed class AuditTimelineDto
{
    public DateTime CreatedAt { get; set; }
    public string? CreatedByName { get; set; }

    public DateTime? CheckDate { get; set; }
    public DateTime? LockedAt { get; set; }
    public string? LockedByName { get; set; }

    public DateTime? CompletedAt { get; set; }
    public string? CompletedByName { get; set; }
}

public sealed class StockTakeReviewDetailDto
{
    // === Basic Info ===
    public int StockTakeId { get; set; }
    public string? Title { get; set; }
    public string? Status { get; set; }
    public int WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public string? Notes { get; set; }

    // === Timeline ===
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public AuditTimelineDto? Timeline { get; set; }

    // === Metrics Summary ===
    public AuditMetricsDto? Metrics { get; set; }

    // === Variance Summary ===
    public VarianceSummaryDto? VarianceSummary { get; set; }

    // === Team Members ===
    public List<TeamMemberDto> TeamMembers { get; set; } = new();

    // === Signatures ===
    public List<SignatureInfoDto> Signatures { get; set; } = new();
}

public sealed class SignatureInfoDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Role { get; set; } // Staff, Manager
    public DateTime? SignedAt { get; set; }
    public string? Notes { get; set; }
}
