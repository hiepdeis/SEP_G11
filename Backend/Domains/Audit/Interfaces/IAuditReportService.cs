namespace Backend.Domains.Audit.Interfaces
{
    public interface IAuditReportService
    {
        Task<byte[]> ExportAuditReportPdfAsync(int stockTakeId, CancellationToken ct);
    }
}
