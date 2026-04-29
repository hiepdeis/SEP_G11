using System.Collections.Generic;
using System.Linq;
using Backend.Data;
using Backend.Extensions;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountant/purchase-orders")]
    [Authorize(Roles = "Accountant, Admin", Policy = "ActiveUserOnly")]
    public class PurchaseOrderAccountantController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;
        private readonly MyDbContext _context;

        public PurchaseOrderAccountantController(IPurchaseOrderService service, MyDbContext context)
        {
            _service = service;
            _context = context;
        }

        private int GetAccountantId()
        {
            return User.GetRequiredUserId();
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                var orders = await _service.GetOrdersAsync();
                var pending = orders
                    .Where(o => o.Status == "Draft")
                    .ToList();

                var userNames = await LoadUserNamesAsync(pending);
                var result = pending
                    .Select(o => PurchaseOrderMapper.ToDto(o, userNames))
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
                var latestId = await _service.GetLatestRevisionIdAsync(purchaseOrderId);
                if (latestId != purchaseOrderId)
                {
                    return BadRequest(new
                    {
                        message = $"PO này đã có bản revision mới hơn. Vui lòng review PO-{latestId} thay thế."
                    });
                }

                var order = await _service.GetOrderAsync(purchaseOrderId);
                if (order == null)
                    return NotFound(new { message = "Purchase order not found" });

                var review = await _service.ReviewPriceAsync(purchaseOrderId);
                var revisionHistory = await _service.GetRevisionHistoryAsync(purchaseOrderId);
                var userNames = await LoadUserNamesAsync(new[] { order });

                var response = new PurchaseOrderReviewResponseDto
                {
                    Order = PurchaseOrderMapper.ToDto(order, userNames),
                    Review = review,
                    RevisionHistory = revisionHistory,
                    RevisionNote = order.RevisionNote
                };

                return Ok(response);
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
                var accountantId = GetAccountantId();
                var order = await _service.AccountantApproveAsync(purchaseOrderId, accountantId);
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
                var accountantId = GetAccountantId();
                var order = await _service.AccountantRejectAsync(purchaseOrderId, accountantId, dto.Reason);
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
