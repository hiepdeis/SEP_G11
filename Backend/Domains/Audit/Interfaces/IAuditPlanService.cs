using Backend.Domains.Audit.DTOs.Accountants;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IAuditPlanService
    {
        Task<AuditPlanResponse> CreateAsync(CreateAuditPlanRequest request, int createdByUserId, CancellationToken ct);

    }
}
