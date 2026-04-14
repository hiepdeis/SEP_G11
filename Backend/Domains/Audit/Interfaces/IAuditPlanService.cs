using Backend.Domains.Audit.DTOs.Accountants;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IAuditPlanService
    {
        Task<AuditPlanResponse> GetByIdAsync(int id, CancellationToken ct);

        Task<AuditPlanResponse> CreateAsync(CreateAuditPlanRequest request, int createdByUserId, CancellationToken ct);
        
        Task<AuditPlanResponse> UpdateAsync(int id, UpdateAuditPlanRequest request, CancellationToken ct);

        Task DeleteAsync(int id, CancellationToken ct);
        
        // Task DeleteBinLocationAsync(int stockTakeId, int binId, CancellationToken ct);
    }
}
