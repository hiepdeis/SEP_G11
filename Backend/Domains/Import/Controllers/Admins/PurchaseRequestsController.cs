using Backend.Domains.Import.DTOs.Admins;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/purchase-requests")]
    public class PurchaseRequestsController : ControllerBase
    {
        private readonly IPurchaseRequestService _service;

        public PurchaseRequestsController(IPurchaseRequestService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetRequests()
        {
            try
            {
                var requests = await _service.GetRequestsAsync();
                var result = requests.Select(ToDto).ToList();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{requestId:long}")]
        public async Task<IActionResult> GetRequest(long requestId)
        {
            try
            {
                var request = await _service.GetRequestAsync(requestId);
                if (request == null)
                    return NotFound(new { message = "Purchase request not found" });

                return Ok(ToDto(request));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("alerts/{alertId:long}")]
        public async Task<IActionResult> CreateFromAlert(long alertId, [FromBody] CreatePurchaseRequestFromAlertDto dto)
        {
            try
            {
                var adminId = 1; // TODO: replace with JWT claims
                var items = dto.Items.Select(i => new PurchaseRequestItem
                {
                    MaterialId = i.MaterialId,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList();

                var request = await _service.CreateRequestFromAlertAsync(alertId, adminId, dto.ProjectId, items);
                return CreatedAtAction(nameof(GetRequest), new { requestId = request.RequestId }, ToDto(request));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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
