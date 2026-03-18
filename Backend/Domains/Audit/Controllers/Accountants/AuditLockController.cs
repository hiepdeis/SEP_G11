using System.Security.Claims;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/manager/audits")]
    //[Authorize]
    public class AuditLockController : ControllerBase
    {
        private readonly IStockTakeLockService _service;

        public AuditLockController(IStockTakeLockService service)
        {
            _service = service;
        }

        private int GetCurrentUserId()
        {
            return 7;
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

        [HttpPost("{stockTakeId:int}/unlock")]
        public async Task<IActionResult> UnlockScope(int stockTakeId, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var result = await _service.UnlockScopeAsync(stockTakeId, userId, ct);

            if (!result.success)
                return BadRequest(new { message = result.message });

            return Ok(new { message = result.message });
        }
    }
}