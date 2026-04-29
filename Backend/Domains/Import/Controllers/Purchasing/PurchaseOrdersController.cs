using System.Collections.Generic;
using System.Linq;
using Backend.Data;
using Backend.Extensions;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Purchasing
{
    [ApiController]
    [Route("api/purchasing/purchase-orders")]
    [Authorize(Roles = "Purchasing", Policy = "ActiveUserOnly")]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;
        private readonly ISupplierService _supplierService;
        private readonly MyDbContext _context;

        public PurchaseOrdersController(
            IPurchaseOrderService service,
            ISupplierService supplierService,
            MyDbContext context)
        {
            _service = service;
            _supplierService = supplierService;
            _context = context;
        }

        private int GetPurchasingId()
        {
            return User.GetRequiredUserId();
        }

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers()
        {
            try
            {
                var suppliers = await _supplierService.GetSuppliersAsync();

                var result = suppliers.Select(s => new
                {
                    supplierId = s.SupplierId,
                    name = s.Name,
                    materialIds = s.MaterialIds
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            try
            {
                var orders = await _service.GetOrdersAsync();
                var userNames = await LoadUserNamesAsync(orders);
                var result = orders.Select(o => PurchaseOrderMapper.ToDto(o, userNames)).ToList();
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

                var userNames = await LoadUserNamesAsync(new[] { order });
                return Ok(PurchaseOrderMapper.ToDto(order, userNames));
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
                var purchasingId = GetPurchasingId();
                var orders = await _service.CreateDraftsAsync(dto.RequestId, purchasingId, dto);
                var userNames = await LoadUserNamesAsync(orders);
                var result = orders.Select(o => PurchaseOrderMapper.ToDto(o, userNames)).ToList();
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
                var purchasingId = GetPurchasingId();
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

        [HttpPatch("{purchaseOrderId:long}/confirm-delivery")]
        public async Task<IActionResult> ConfirmDelivery(long purchaseOrderId, [FromBody] ConfirmDeliveryDto dto)
        {
            try
            {
                var order = await _service.ConfirmDeliveryAsync(
                    purchaseOrderId,
                    dto.ExpectedDeliveryDate,
                    dto.SupplierNote);

                return Ok(new
                {
                    purchaseOrderId = order.PurchaseOrderId,
                    status = order.Status,
                    expectedDeliveryDate = order.ExpectedDeliveryDate,
                    supplierNote = order.SupplierNote
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

        private async Task<Dictionary<int, string>> LoadUserNamesAsync(IEnumerable<PurchaseOrder> orders)
        {
            var userIds = orders
                .SelectMany(GetUserIds)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            if (userIds.Count == 0)
                return new Dictionary<int, string>();

            return await _context.Users
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(
                    u => u.UserId,
                    u => string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName);
        }

        private static IEnumerable<int?> GetUserIds(PurchaseOrder order)
        {
            return new int?[]
            {
                order.CreatedBy,
                order.AccountantApprovedBy,
                order.AdminApprovedBy
            };
        }
    }
}
