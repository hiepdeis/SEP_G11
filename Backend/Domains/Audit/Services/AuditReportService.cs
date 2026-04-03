using Backend.Data;
using Backend.Domains.Audit.DTOs.Accountants;

using Backend.Domains.Audit.Interfaces;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace Backend.Domains.Audit.Services;

public sealed class AuditReportService : IAuditReportService
{
    private readonly MyDbContext _db;

    public AuditReportService(MyDbContext db)
    {
        _db = db;
    }

    public async Task<byte[]> ExportAuditReportPdfAsync(int stockTakeId, CancellationToken ct)
    {
        var header = await (
            from st in _db.StockTakes.AsNoTracking()
            join wh in _db.Warehouses.AsNoTracking() on st.WarehouseId equals wh.WarehouseId
            join createdBy in _db.Users.AsNoTracking() on st.CreatedBy equals createdBy.UserId
            join completedBy in _db.Users.AsNoTracking() on st.CompletedBy equals completedBy.UserId into completedByJoin
            from completedBy in completedByJoin.DefaultIfEmpty()
            where st.StockTakeId == stockTakeId
            select new AuditReportDto
            {
                StockTakeId = st.StockTakeId,
                Title = st.Title,
                WarehouseName = wh.Name,
                Status = st.Status,
                CheckDate = st.CheckDate,
                CreatedAt = st.CreatedAt,
                CompletedAt = st.CompletedAt,
                CreatedByName = createdBy.FullName,
                CompletedByName = completedBy != null ? completedBy.FullName : null,
                Notes = st.Notes
            }
        ).FirstOrDefaultAsync(ct);

        if (header == null)
            throw new ArgumentException("Audit không tồn tại.");

        var isCompleted =
            string.Equals(header.Status, "Completed", StringComparison.OrdinalIgnoreCase)
            || header.CompletedAt != null;

        if (!isCompleted)
            throw new InvalidOperationException("Chỉ được xuất biên bản khi audit đã Completed.");
        var committeeMembers = await (
    from tm in _db.StockTakeTeamMembers.AsNoTracking()
    join u in _db.Users.AsNoTracking() on tm.UserId equals u.UserId
    join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
    where tm.StockTakeId == stockTakeId
    orderby u.FullName
    select new AuditReportCommitteeMemberDto
    {
        UserId = u.UserId,
        FullName = u.FullName,
        RoleName = r.RoleName
    }
).Distinct().ToListAsync(ct);
        var details = await (
    from d in _db.StockTakeDetails.AsNoTracking()
    join m in _db.Materials.AsNoTracking() on d.MaterialId equals m.MaterialId
    join b in _db.Batches.AsNoTracking() on d.BatchId equals b.BatchId into batchJoin
    from b in batchJoin.DefaultIfEmpty()
    join bin in _db.BinLocations.AsNoTracking() on d.BinId equals bin.BinId into binJoin
    from bin in binJoin.DefaultIfEmpty()
    join countedBy in _db.Users.AsNoTracking() on d.CountedBy equals countedBy.UserId into countedJoin
    from countedBy in countedJoin.DefaultIfEmpty()
    join resolvedBy in _db.Users.AsNoTracking() on d.ResolvedBy equals resolvedBy.UserId into resolvedJoin
    from resolvedBy in resolvedJoin.DefaultIfEmpty()
    where d.StockTakeId == stockTakeId
    orderby m.Name, b.BatchCode, bin.Code
    select new AuditReportDetailDto
    {
        Id = d.Id,
        MaterialCode = m.Code,
        MaterialName = m.Name,
        Unit = m.Unit,
        BatchCode = b != null ? b.BatchCode : null,
        BinCode = bin != null ? bin.Code : null,

        SystemQty = d.SystemQty ?? 0,
        CountQty = d.CountQty ?? 0,
        Variance = d.Variance ?? 0,
        UnitPrice = m.UnitPrice ?? 0,

        SystemAmount = (d.SystemQty ?? 0) * (m.UnitPrice ?? 0),
        CountAmount = (d.CountQty ?? 0) * (m.UnitPrice ?? 0),
        VarianceAmount = (d.Variance ?? 0) * (m.UnitPrice ?? 0),

        // thiếu thì variance âm
        ShortAmount = (d.Variance ?? 0) < 0
        ? Math.Abs((d.Variance ?? 0) * (m.UnitPrice ?? 0))
        : 0,

        // thừa thì variance dương
        OverAmount = (d.Variance ?? 0) > 0
        ? (d.Variance ?? 0) * (m.UnitPrice ?? 0)
        : 0,

        Reason = d.Reason,
        DiscrepancyStatus = d.DiscrepancyStatus,
        ResolutionAction = d.ResolutionAction,
        CountRound = d.CountRound,
        CountedByName = countedBy != null ? countedBy.FullName : null,
        CountedAt = d.CountedAt,
        ResolvedByName = resolvedBy != null ? resolvedBy.FullName : null,
        ResolvedAt = d.ResolvedAt
    }
).ToListAsync(ct);

        var signatures = await (
            from s in _db.StockTakeSignatures.AsNoTracking()
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            where s.StockTakeId == stockTakeId
            orderby s.SignedAt
            select new AuditReportSignatureDto
            {
                Role = s.Role,
                UserId = s.UserId,
                FullName = u.FullName,
                SignedAt = s.SignedAt
            }
        ).ToListAsync(ct);

        var adjustments = await (
            from a in _db.InventoryAdjustmentEntries.AsNoTracking()
            join m in _db.Materials.AsNoTracking() on a.MaterialId equals m.MaterialId into materialJoin
            from m in materialJoin.DefaultIfEmpty()
            join b in _db.Batches.AsNoTracking() on a.BatchId equals b.BatchId into batchJoin
            from b in batchJoin.DefaultIfEmpty()
            join bin in _db.BinLocations.AsNoTracking() on a.BinId equals bin.BinId into binJoin
            from bin in binJoin.DefaultIfEmpty()
            join createdBy in _db.Users.AsNoTracking() on a.CreatedBy equals createdBy.UserId into createdJoin
            from createdBy in createdJoin.DefaultIfEmpty()
            join approvedBy in _db.Users.AsNoTracking() on a.ApprovedBy equals approvedBy.UserId into approvedJoin
            from approvedBy in approvedJoin.DefaultIfEmpty()
            where a.StockTakeId == stockTakeId
            orderby a.EntryId
            select new AuditReportAdjustmentDto
            {
                EntryId = a.EntryId,
                StockTakeDetailId = a.StockTakeDetailId,
                MaterialCode = m != null ? m.Code : null,
                MaterialName = m != null ? m.Name : null,
                BatchCode = b != null ? b.BatchCode : null,
                BinCode = bin != null ? bin.Code : null,
                QtyDelta = a.QtyDelta,
                Status = a.Status,
                CreatedByName = createdBy != null ? createdBy.FullName : null,
                CreatedAt = a.CreatedAt,
                ApprovedByName = approvedBy != null ? approvedBy.FullName : null,
                ApprovedAt = a.ApprovedAt,
                PostedAt = a.PostedAt
            }
        ).ToListAsync(ct);

        header.Details = details;
        header.Signatures = signatures;
        header.Adjustments = adjustments;
        header.CommitteeMembers = committeeMembers;
        header.TotalItems = details.Count;
        header.CountedItems = details.Count(x => x.CountedAt != null);
        header.VarianceItems = details.Count(x => x.Variance != 0);
        header.TotalSystemQty = details.Sum(x => x.SystemQty);
        header.TotalCountQty = details.Sum(x => x.CountQty);
        header.TotalSystemAmount = details.Sum(x => x.SystemAmount);
        header.TotalCountAmount = details.Sum(x => x.CountAmount);
        header.TotalVarianceAmount = details.Sum(x => x.VarianceAmount);
        var document = new AuditReportPdfDocument(header);
        return document.GeneratePdf();
    }
}