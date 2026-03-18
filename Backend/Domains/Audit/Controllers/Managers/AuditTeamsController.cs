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
    {
        try
        {
            var result = await _svc.GetTeamAsync(stockTakeId, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
    [HttpGet("{stockTakeId:int}/eligible-staff")]
    public async Task<ActionResult<List<EligibleStaffDto>>> EligibleStaff(int stockTakeId, CancellationToken ct)
    {
        try
        {
            return Ok(await _svc.GetEligibleStaffAsync(stockTakeId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }


[HttpPost("{stockTakeId:int}/team")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status409Conflict)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> SaveTeam(int stockTakeId, [FromBody] SaveTeamRequest req, CancellationToken ct)
{
    try
    {
        var managerId = GetUserIdOrDevFallback();
        await _svc.SaveTeamAsync(stockTakeId, req, managerId, ct);

        return Ok(new { message = "Assigned successfully." });
        // hoặc return NoContent(); (thường chuẩn hơn cho update)
    }
    catch (ArgumentException ex)
    {
        // Audit không tồn tại / dữ liệu không hợp lệ kiểu "WarehouseId không tồn tại"
        return NotFound(new { message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        // Business rule: staff đang bận audit khác, audit không đúng trạng thái, ...
        return Conflict(new { message = ex.Message }); // 409
    }
}



[HttpDelete("{stockTakeId:int}/team/{userId:int}")]
    public async Task<IActionResult> Remove(int stockTakeId, int userId, CancellationToken ct)
    {
        var managerId = GetUserIdOrDevFallback();
        await _svc.RemoveMemberAsync(stockTakeId, userId, managerId, ct);
        return Ok(new { message = "Removed successfully." });
    }
}
