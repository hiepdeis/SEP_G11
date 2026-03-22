using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface IPurchaseRequestService
    {
        Task<PurchaseRequest> CreateRequestFromAlertAsync(long alertId, int adminId, int projectId, List<PurchaseRequestItem> items);
        Task<List<PurchaseRequest>> GetRequestsAsync();
        Task<List<PurchaseRequest>> GetPendingRequestsAsync();
        Task<PurchaseRequest?> GetRequestAsync(long requestId);
        Task<PurchaseRequest> UpdateStatusAsync(long requestId, string status);
    }
}