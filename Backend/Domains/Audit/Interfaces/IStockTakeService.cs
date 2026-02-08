using Backend.Domains.Audit.DTOs.Accountant;
using Backend.Domains.Audit.DTOs.Manager;
using Backend.Domains.Audit.DTOs.Staff;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IStockTakeService
    {
        Task<StockTakeCreateResponse> CreateAsync(int currentUserId, StockTakeCreateRequest request, CancellationToken ct = default);
        Task<AssignTeamResponse> AssignTeamAsync(int managerUserId, int stockTakeId, AssignTeamRequest request, CancellationToken ct = default);
        Task<LockAuditResponse> LockAsync(int managerUserId, int stockTakeId, LockAuditRequest? request, CancellationToken ct = default);
        Task<List<MyAssignmentsResponse>> GetMyAssignmentsAsync(int currentUserId, CancellationToken ct = default);

        Task<bool> RespondAssignmentAsync(int currentUserId, long teamMemberId, AcceptAssignmentRequest request, CancellationToken ct = default);

    }
}
