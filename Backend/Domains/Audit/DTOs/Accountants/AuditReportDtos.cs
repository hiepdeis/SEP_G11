namespace Backend.Domains.Audit.DTOs.Accountants
{
    public sealed class AuditReportDto
    {
        public int StockTakeId { get; set; }
        public string? Title { get; set; }
        public string? WarehouseName { get; set; }
        public string? Status { get; set; }
        public DateTime? CheckDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? CreatedByName { get; set; }
        public string? CompletedByName { get; set; }
        public string? Notes { get; set; }

        public List<AuditReportDetailDto> Details { get; set; } = new();
        public List<AuditReportSignatureDto> Signatures { get; set; } = new();
        public List<AuditReportAdjustmentDto> Adjustments { get; set; } = new();
        public List<AuditReportCommitteeMemberDto> CommitteeMembers { get; set; } = new();

        public int TotalItems { get; set; }
        public int CountedItems { get; set; }
        public int VarianceItems { get; set; }

        public decimal TotalSystemQty { get; set; }
        public decimal TotalCountQty { get; set; }

        // NEW
        public decimal TotalSystemAmount { get; set; }
        public decimal TotalCountAmount { get; set; }
        public decimal TotalVarianceAmount { get; set; }
    }

    public sealed class AuditReportDetailDto
    {
        public long Id { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public string? Unit { get; set; }
        public string? BatchCode { get; set; }
        public string? BinCode { get; set; }

        public decimal SystemQty { get; set; }
        public decimal CountQty { get; set; }
        public decimal Variance { get; set; }
        public decimal UnitPrice { get; set; }

        public decimal SystemAmount { get; set; }
        public decimal CountAmount { get; set; }
        public decimal VarianceAmount { get; set; }

        // thêm 2 dòng này
        public decimal ShortAmount { get; set; }   // tiền thiếu
        public decimal OverAmount { get; set; }    // tiền thừa

        public string? Reason { get; set; }
        public string? DiscrepancyStatus { get; set; }
        public string? ResolutionAction { get; set; }
        public int CountRound { get; set; }
        public string? CountedByName { get; set; }
        public DateTime? CountedAt { get; set; }
        public string? ResolvedByName { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
    public sealed class AuditReportSignatureDto
    {
        public string? Role { get; set; }
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public DateTime SignedAt { get; set; }
        public string? SignatureData { get; set; }
    }

    public sealed class AuditReportAdjustmentDto
    {
        public long EntryId { get; set; }
        public long StockTakeDetailId { get; set; }

        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public string? BatchCode { get; set; }
        public string? BinCode { get; set; }

        public decimal QtyDelta { get; set; }
        public string? Status { get; set; }

        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }

        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PostedAt { get; set; }
    }

    public sealed class AuditReportCommitteeMemberDto
    {
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public string? RoleName { get; set; }
    }
}