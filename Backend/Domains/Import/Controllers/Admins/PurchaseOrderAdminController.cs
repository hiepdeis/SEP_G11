using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/purchase-orders")]
    public class PurchaseOrderAdminController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;

        public PurchaseOrderAdminController(IPurchaseOrderService service)
        {
            _service = service;
        }

        [HttpPost("{purchaseOrderId:long}/approve")]
        public async Task<IActionResult> Approve(long purchaseOrderId)
        {
            try
            {
                var adminId = 1; // TODO: replace with JWT claims
                var order = await _service.AdminApproveAsync(purchaseOrderId, adminId);
                return Ok(PurchaseOrderMapper.ToDto(order));
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

        [HttpPost("{purchaseOrderId:long}/reject")]
        public async Task<IActionResult> Reject(long purchaseOrderId, [FromBody] PurchaseOrderRejectDto dto)
        {
            try
            {
                var adminId = 1; // TODO: replace with JWT claims
                var order = await _service.AdminRejectAsync(purchaseOrderId, adminId, dto.Reason);
                return Ok(PurchaseOrderMapper.ToDto(order));
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
    }
}
