using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Purchasing
{
    [ApiController]
    [Route("api/purchasing/purchase-orders")]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;

        public PurchaseOrdersController(IPurchaseOrderService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            try
            {
                var orders = await _service.GetOrdersAsync();
                var result = orders.Select(PurchaseOrderMapper.ToDto).ToList();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{purchaseOrderId:long}")]
        public async Task<IActionResult> GetOrder(long purchaseOrderId)
        {
            try
            {
                var order = await _service.GetOrderAsync(purchaseOrderId);
                if (order == null)
                    return NotFound(new { message = "Purchase order not found" });

                return Ok(PurchaseOrderMapper.ToDto(order));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("draft")]
        public async Task<IActionResult> CreateDraft([FromBody] CreatePurchaseOrderDraftDto dto)
        {
            try
            {
                var purchasingId = 1; // TODO: replace with JWT claims
                var orders = await _service.CreateDraftsAsync(dto.RequestId, purchasingId, dto);
                var result = orders.Select(PurchaseOrderMapper.ToDto).ToList();
                return Ok(result);
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

        [HttpPost("{purchaseOrderId:long}/send")]
        public async Task<IActionResult> SendToSupplier(long purchaseOrderId)
        {
            try
            {
                var purchasingId = 1; // TODO: replace with JWT claims
                var order = await _service.GetOrderAsync(purchaseOrderId);
                if (order == null)
                    return NotFound(new { message = "Purchase order not found" });

                if (order.Status != "AdminApproved")
                    return BadRequest(new { message = "Purchase order is not approved by admin" });

                var updated = await _service.SendToSupplierAsync(purchaseOrderId, purchasingId);

                return Ok(new
                {
                    purchaseOrderId = updated.PurchaseOrderId,
                    status = updated.Status,
                    sentAt = updated.SentToSupplierAt
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
    }
}
