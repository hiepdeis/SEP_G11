using Backend.Domains.outbound.Services;

namespace Backend.Domains.outbound.Interface
{
    public interface IIssueSlipWorkflowService
    {
        Task <(bool Success, string Message)> ForwardToWarehouseAsync (long slipId, string reason);
        Task<(bool Success, string Message)> ForwardToPurchasingAsync(long slipId, int createdBy, string reason);
        Task<(bool Success, string Message)> StartPickingAsync(long slipId, int assignedPickerId, string reason);
        Task<(bool Success, string Message)> FinishPickingAndDeductInventoryAsync(long slipId, int actualPickerId, string reason);
        Task<(bool Success, string Message)> CompleteReceiptAsync(long slipId, string reason);
        Task<(bool Success, string Message)> CloseSlipAsync(long slipId, string reason);
    }
}
