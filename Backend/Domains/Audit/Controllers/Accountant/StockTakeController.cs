using Backend.Domains.Audit.DTOs.Accountant;
using Backend.Domains.Audit.DTOs.Manager;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Accountant
{
    [ApiController]
    [Route("api/stocktakes")]
    public class StockTakeController : ControllerBase
    {
        private readonly IStockTakeService _service;

        public StockTakeController(IStockTakeService service)
        {
            _service = service;
        }

        // Accountant creates audit
        [HttpPost]
       // [Authorize] // bạn có thể thêm policy/role: [Authorize(Roles="Accountant")] nếu hệ thống bạn có role claim
        public async Task<ActionResult<StockTakeCreateResponse>> Create([FromBody] StockTakeCreateRequest request, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var result = await _service.CreateAsync(userId, request, ct);
            return CreatedAtAction(nameof(GetByIdPlaceholder), new { id = result.StockTakeId }, result);
        }

        // Placeholder để CreatedAtAction không lỗi (bạn làm GET by id sau)
        [HttpGet("{id:int}")]
       
        public IActionResult GetByIdPlaceholder([FromRoute] int id) => Ok(new { id });

        private int GetCurrentUserId()
        {
            //// Common patterns: ClaimTypes.NameIdentifier or "UserID"
            //var raw =
            //    User.FindFirstValue(ClaimTypes.NameIdentifier)
            //    ?? User.FindFirstValue("UserID")
            //    ?? User.FindFirstValue("userId");

            //if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
            //    throw new UnauthorizedAccessException("Cannot determine current user id from token.");

            //return userId;
            return 1; // TODO: Replace with actual user ID extraction logic
        }
        [HttpPost("{id:int}/team")]
        //[Authorize] // sau này bạn gắn role Manager
        public async Task<ActionResult<AssignTeamResponse>> AssignTeam([FromRoute] int id, [FromBody] AssignTeamRequest request, CancellationToken ct)
        {
            var managerId = GetCurrentUserId(); // hoặc hardcode nếu bạn đang debug
            var result = await _service.AssignTeamAsync(managerId, id, request, ct);
            return Ok(result);
        }
        [HttpPost("{id:int}/lock")]
        //[Authorize]
        public async Task<ActionResult<LockAuditResponse>> Lock([FromRoute] int id, [FromBody] LockAuditRequest? request, CancellationToken ct)
        {
            var managerId = GetCurrentUserId(); // hoặc hardcode đang debug
            var result = await _service.LockAsync(managerId, id, request, ct);
            return Ok(result);
        }
    }
}