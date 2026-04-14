using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/audits")]
    [Authorize(Roles = "Admin")]
    public class AdminAuditController : ControllerBase
    {
        private readonly IStockTakeReviewService _reviewService;

        public AdminAuditController(IStockTakeReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        /// <summary>Admin issues penalty and finalizes the audit</summary>
        [HttpPost("{stockTakeId:int}/finalize")]
        public async Task<IActionResult> Finalize(
            [FromRoute] int stockTakeId,
            [FromBody] AdminFinalizeRequest request,
            CancellationToken ct)
        {
            var userId = User.GetRequiredUserId();
            var result = await _reviewService.AdminFinalizeAsync(stockTakeId, userId, request, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }
    }
}
