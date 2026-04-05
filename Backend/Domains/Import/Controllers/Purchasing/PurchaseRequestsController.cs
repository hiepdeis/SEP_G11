using System.Collections.Generic;
using System.Linq;
using Backend.Data;
using Backend.Domains.Import.DTOs.Admins;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Purchasing
{
    [ApiController]
    [Route("api/purchasing/purchase-requests")]
    public class PurchaseRequestsController : ControllerBase
    {
        private readonly IPurchaseRequestService _service;
        private readonly IPurchaseOrderService _purchaseOrderService;
        private readonly MyDbContext _context;

        public PurchaseRequestsController(
            IPurchaseRequestService service,
            IPurchaseOrderService purchaseOrderService,
            MyDbContext context)
        {
            _service = service;
            _purchaseOrderService = purchaseOrderService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetRequests()
        {
            try
            {
                var requests = await _service.GetPendingRequestsAsync();
                var userNames = await LoadUserNamesAsync(requests);
                var result = requests.Select(r => ToDto(r, userNames)).ToList();

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

        private static PurchaseRequestDto ToDto(PurchaseRequest request, IReadOnlyDictionary<int, string> userNames)
        {
            return new PurchaseRequestDto
            {
                RequestId = request.RequestId,
                RequestCode = request.RequestCode,
                ProjectId = request.ProjectId,
                ProjectName = request.Project?.Name ?? string.Empty,
                AlertId = request.AlertId,
                CreatedBy = request.CreatedBy,
                CreatedByName = GetUserName(userNames, request.CreatedBy),
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

        private async Task<Dictionary<int, string>> LoadUserNamesAsync(IEnumerable<PurchaseRequest> requests)
        {
            var userIds = requests
                .Select(r => r.CreatedBy)
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

        private static string? GetUserName(IReadOnlyDictionary<int, string> userNames, int userId)
        {
            return userNames.TryGetValue(userId, out var name) ? name : null;
        }
    }
}
