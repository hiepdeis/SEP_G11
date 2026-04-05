using System.Collections.Generic;
using System.Linq;
using Backend.Data;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/purchase-orders")]
    public class PurchaseOrderAdminController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;
        private readonly MyDbContext _context;

        public PurchaseOrderAdminController(IPurchaseOrderService service, MyDbContext context)
        {
            _service = service;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                var orders = await _service.GetOrdersAsync();
                var result = orders
                    .Where(o => o.Status == "AccountantApproved")
                    .ToList();

                var userNames = await LoadUserNamesAsync(result);
                var mapped = result
                    .Select(o => PurchaseOrderMapper.ToDto(o, userNames))
                    .ToList();

                return Ok(mapped);
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
                var adminId = 1; // TODO: replace with JWT claims
                var order = await _service.AdminApproveAsync(purchaseOrderId, adminId);
                var userNames = await LoadUserNamesAsync(new[] { order });
                return Ok(PurchaseOrderMapper.ToDto(order, userNames));
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
                var userNames = await LoadUserNamesAsync(new[] { order });
                return Ok(PurchaseOrderMapper.ToDto(order, userNames));
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
