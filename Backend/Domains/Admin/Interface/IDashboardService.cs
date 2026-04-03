using Backend.Domains.Admin.Dtos;

namespace Backend.Domains.Admin.Interface
{
    public interface IDashboardService
    {
        Task<DashboardResponseDto> GetDashboardAsync(CancellationToken ct);
    }
}
