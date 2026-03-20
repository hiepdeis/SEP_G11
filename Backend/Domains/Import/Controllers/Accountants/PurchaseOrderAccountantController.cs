using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountant/purchase-orders")]
    public class PurchaseOrderAccountantController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;

        public PurchaseOrderAccountantController(IPurchaseOrderService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                var orders = await _service.GetOrdersAsync();
                var result = orders
                    .Where(o => o.Status == "Draft")
                    .Select(PurchaseOrderMapper.ToDto)
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{purchaseOrderId:long}/review")]
        public async Task<IActionResult> GetReview(long purchaseOrderId)
        {
            try
            {
                var order = await _service.GetOrderAsync(purchaseOrderId);
                if (order == null)
                    return NotFound(new { message = "Purchase order not found" });

                var review = await _service.ReviewPriceAsync(purchaseOrderId);

                return Ok(new
                {
                    order = PurchaseOrderMapper.ToDto(order),
                    review
                });
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

        [HttpPost("{purchaseOrderId:long}/approve")]
        public async Task<IActionResult> Approve(long purchaseOrderId)
        {
            try
            {
                var accountantId = 1; // TODO: replace with JWT claims
                var order = await _service.AccountantApproveAsync(purchaseOrderId, accountantId);
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
                var accountantId = 1; // TODO: replace with JWT claims
                var order = await _service.AccountantRejectAsync(purchaseOrderId, accountantId, dto.Reason);
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
