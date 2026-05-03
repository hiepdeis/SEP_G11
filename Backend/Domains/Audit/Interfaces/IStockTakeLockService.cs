using System.Threading;
using System.Threading.Tasks;

namespace Backend.Domains.Audit.Interfaces
{
    public interface IStockTakeLockService
    {
        Task<(bool success, string message)> LockScopeAsync(int stockTakeId, int userId, CancellationToken ct);

    }
}