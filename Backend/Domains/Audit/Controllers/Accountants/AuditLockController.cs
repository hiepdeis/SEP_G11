using System.Security.Claims;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/accountants/audits")]
    [Authorize(Roles = "Accountant,Admin")]
    public class AuditLockController : ControllerBase
    {
        private readonly IStockTakeLockService _service;

        public AuditLockController(IStockTakeLockService service)
        {
            _service = service;
        }

        private int GetCurrentUserId()
        {
            return User.GetRequiredUserId();
        }

        [HttpPost("{stockTakeId:int}/lock")]
        public async Task<IActionResult> LockScope(int stockTakeId, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var result = await _service.LockScopeAsync(stockTakeId, userId, ct);

            if (!result.success)
                return BadRequest(new { message = result.message });

            return Ok(new { message = result.message });
        }

    }
}
