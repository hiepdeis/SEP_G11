using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Staffs;

[ApiController]
[Route("api/staff/audits")]
public class AuditWorkController : ControllerBase
{
    private readonly IAuditTeamService _svc;

    public AuditWorkController(IAuditTeamService svc)
    {
        _svc = svc;
    }

    private int GetUserIdOrDevFallback()
    {
        // Dùng lại logic của bạn nếu đã có BaseController.
        // Tạm thời ví dụ:
        var claim = User?.Claims?.FirstOrDefault(c => c.Type == "userId")?.Value;
        return int.TryParse(claim, out var id) ? id : 4;
    }

    // POST api/staff/audits/{stockTakeId}/finish
    [HttpPost("{stockTakeId:int}/finish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> FinishMyWork(int stockTakeId, CancellationToken ct)
    {
        try
        {
            var staffId = GetUserIdOrDevFallback();
            await _svc.MarkMyWorkDoneAsync(stockTakeId, staffId, ct);
            return Ok(new { message = "Marked as finished." });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
