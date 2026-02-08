using Backend.Domains.Audit.DTOs;
using Backend.Domains.Audit.DTOs.Staff;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Staff;

[ApiController]
[Route("api/stocktakes/staff")]
public class StockTakeStaffController : ControllerBase
{
    private readonly IStockTakeService _service;

    public StockTakeStaffController(IStockTakeService service)
    {
        _service = service;
    }

    // Staff xem danh sách việc mình được assign
    [HttpGet("assignments")]
    //[Authorize]
    public async Task<ActionResult> MyAssignments(CancellationToken ct)
    {
        var userId = GetCurrentUserIdFixedOrToken();
        var result = await _service.GetMyAssignmentsAsync(userId, ct);
        return Ok(result);
    }

    // Staff Accept/Decline một assignment
    [HttpPost("assignments/{teamMemberId:long}/respond")]
    //[Authorize]
    public async Task<ActionResult> Respond([FromRoute] long teamMemberId, [FromBody] AcceptAssignmentRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserIdFixedOrToken();
        await _service.RespondAssignmentAsync(userId, teamMemberId, request, ct);
        return Ok(new { success = true });
    }

    private int GetCurrentUserIdFixedOrToken()
    {
        //// Nếu bạn đang "cố định userId" để dev: đổi số này thành user staff đang test
        //// return 4;

        //var raw =
        //    User.FindFirstValue(ClaimTypes.NameIdentifier)
        //    ?? User.FindFirstValue("UserID")
        //    ?? User.FindFirstValue("UserId")
        //    ?? User.FindFirstValue("userId")
        //    ?? User.FindFirstValue("id")
        //    ?? User.FindFirstValue("sub");

        //if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
        //    throw new UnauthorizedAccessException("Cannot determine current user id from token.");

        //return userId;
        return 1; // TODO: Replace with actual user ID extraction logic
    }
}
