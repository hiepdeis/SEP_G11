using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Managers;

[ApiController]
[Route("api/manager/audits")]
//[Authorize(Roles = "Warehouse Manager")]
public class AuditTeamsController : ControllerBase
{
    private readonly IAuditTeamService _svc;
    private readonly IWebHostEnvironment _env;

    public AuditTeamsController(IAuditTeamService svc, IWebHostEnvironment env)
    {
        _svc = svc;
        _env = env;
    }

    private int GetUserIdOrDevFallback()
    {
        // prod: lấy từ claims
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("userId") ??
            User.FindFirstValue("id") ??
            User.FindFirstValue("sub");

        if (int.TryParse(idStr, out var uid)) return uid;

        // dev fallback để test nhanh
        if (_env.IsDevelopment()) return 1;

        throw new UnauthorizedAccessException("Invalid user identity.");
    }

    [HttpGet("{stockTakeId:int}/team")]
    public async Task<ActionResult<AuditTeamResponse>> GetTeam(int stockTakeId, CancellationToken ct)
        => Ok(await _svc.GetTeamAsync(stockTakeId, ct));

    [HttpGet("{stockTakeId:int}/eligible-staff")]
    public async Task<ActionResult<List<EligibleStaffDto>>> EligibleStaff(int stockTakeId, CancellationToken ct)
        => Ok(await _svc.GetEligibleStaffAsync(stockTakeId, ct));

    [HttpPost("{stockTakeId:int}/team")]
    public async Task<IActionResult> SaveTeam(int stockTakeId, [FromBody] SaveTeamRequest req, CancellationToken ct)
    {
        var managerId = GetUserIdOrDevFallback();
        await _svc.SaveTeamAsync(stockTakeId, req, managerId, ct);
        return Ok(new { message = "Assigned successfully." });
    }

    [HttpDelete("{stockTakeId:int}/team/{userId:int}")]
    public async Task<IActionResult> Remove(int stockTakeId, int userId, CancellationToken ct)
    {
        var managerId = GetUserIdOrDevFallback();
        await _svc.RemoveMemberAsync(stockTakeId, userId, managerId, ct);
        return Ok(new { message = "Removed successfully." });
    }
}
