using Backend.Domains.Import.DTOs.Admins;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Purchasing
{
    [ApiController]
    [Route("api/purchasing/purchase-requests")]
    public class PurchaseRequestsController : ControllerBase
    {
        private readonly IPurchaseRequestService _service;
        private readonly IPurchaseOrderService _purchaseOrderService;

        public PurchaseRequestsController(IPurchaseRequestService service, IPurchaseOrderService purchaseOrderService)
        {
            _service = service;
            _purchaseOrderService = purchaseOrderService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRequests()
        {
            try
            {
                var requests = await _service.GetPendingRequestsAsync();
                var result = requests.Select(ToDto).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{requestId:long}/po-history")]
        public async Task<IActionResult> GetPoHistory(long requestId)
        {
            try
            {
                var history = await _purchaseOrderService.GetPurchaseOrderHistoryAsync(requestId);
                return Ok(history);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        private static PurchaseRequestDto ToDto(PurchaseRequest request)
        {
            return new PurchaseRequestDto
            {
                RequestId = request.RequestId,
                RequestCode = request.RequestCode,
                ProjectId = request.ProjectId,
                ProjectName = request.Project?.Name ?? string.Empty,
                AlertId = request.AlertId,
                CreatedBy = request.CreatedBy,
                CreatedAt = request.CreatedAt,
                Status = request.Status,
                Items = request.Items.Select(i => new PurchaseRequestItemDto
                {
                    ItemId = i.ItemId,
                    MaterialId = i.MaterialId,
                    MaterialCode = i.Material?.Code ?? string.Empty,
                    MaterialName = i.Material?.Name ?? string.Empty,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList()
            };
        }
    }
}
