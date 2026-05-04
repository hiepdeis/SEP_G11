using Backend.Domains.Audit.DTOs.Managers;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IAuditTeamService
    {
        Task<AuditTeamResponse> GetTeamAsync(int stockTakeId, CancellationToken ct);
        Task<List<EligibleStaffDto>> GetEligibleStaffAsync(int stockTakeId, CancellationToken ct);
        Task SaveTeamAsync(int stockTakeId, SaveTeamRequest request, int managerUserId, CancellationToken ct);
        Task RemoveMemberAsync(int stockTakeId, int userId, int managerUserId, CancellationToken ct);
    }
}
