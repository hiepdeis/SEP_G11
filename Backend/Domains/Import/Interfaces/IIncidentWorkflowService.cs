using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface IIncidentWorkflowService
    {
        Task<IncidentReport> SubmitIncidentToManagerAsync(long incidentId, int staffId);
        Task<List<ManagerIncidentSummaryDto>> GetManagerIncidentsAsync();
        Task<ManagerIncidentDetailDto> GetManagerIncidentAsync(long incidentId);
        Task<IncidentReport> ApproveIncidentAsync(long incidentId, int managerId, string? notes);
        Task<List<PurchasingIncidentSummaryDto>> GetPurchasingIncidentsAsync();
        Task<PurchasingIncidentDetailDto> GetPurchasingIncidentAsync(long incidentId);
        Task<SupplementaryReceiptResultDto> CreateSupplementaryReceiptAsync(long incidentId, int purchasingId, CreateSupplementaryReceiptDto dto);
        Task<ManagerSupplementaryReceiptDto> GetSupplementaryReceiptAsync(long incidentId);
        Task<ManagerSupplementaryApprovalResultDto> ApproveSupplementaryReceiptAsync(long incidentId, int managerId, string? notes);
        Task<ManagerSupplementaryRejectResultDto> RejectSupplementaryReceiptAsync(long incidentId, int managerId, string reason);
    }
}
