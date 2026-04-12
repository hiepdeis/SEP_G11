using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountants/audits")]
    [Authorize(Roles = "Accountant,Admin")]
    public class AccountantReviewController : ControllerBase
    {
        private readonly IStockTakeReviewService _reviewService;

        public AccountantReviewController(IStockTakeReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        /// <summary>Accountant reviews audit: "Approve" (all matched) or "ForwardToManager" (has discrepancies)</summary>
        [HttpPost("{stockTakeId:int}/review")]
        public async Task<IActionResult> AccountantReview(
            [FromRoute] int stockTakeId,
            [FromBody] AccountantReviewRequest request,
            CancellationToken ct)
        {
            var userId = User.GetRequiredUserId();
            var result = await _reviewService.AccountantReviewAsync(stockTakeId, userId, request.Action, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        /// <summary>Accountant approves Manager's resolve → complete + update inventory</summary>
        [HttpPost("{stockTakeId:int}/approve-resolve")]
        public async Task<IActionResult> ApproveResolve(
            [FromRoute] int stockTakeId,
            CancellationToken ct)
        {
            var userId = User.GetRequiredUserId();
            var result = await _reviewService.AccountantApproveResolveAsync(stockTakeId, userId, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        /// <summary>Accountant rejects Manager's resolve → escalate to Admin</summary>
        [HttpPost("{stockTakeId:int}/reject-resolve")]
        public async Task<IActionResult> RejectResolve(
            [FromRoute] int stockTakeId,
            [FromBody] RejectResolveBody body,
            CancellationToken ct)
        {
            var userId = User.GetRequiredUserId();
            var result = await _reviewService.AccountantRejectResolveAsync(stockTakeId, userId, body?.Notes, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        public class RejectResolveBody
        {
            public string? Notes { get; set; }
        }
    }
}
