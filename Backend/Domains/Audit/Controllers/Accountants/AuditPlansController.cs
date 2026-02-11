using Backend.Domains.Audit.DTOs;
using Backend.Domains.Audit.DTOs.Accountants;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Audit.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountants/audits")]
    // Nếu bạn đã set role-based auth:
    //[Authorize(Roles = "Accountant")]
    public class AuditPlansController : ControllerBase
    {
        private readonly IAuditPlanService _service;

        public AuditPlansController(IAuditPlanService service)
        {
            _service = service;
        }

        [HttpPost("plans")]
        public async Task<IActionResult> CreatePlan([FromBody] CreateAuditPlanRequest request, CancellationToken ct)
        {
            int userID = 1; // FIX CỨNG để test
            //Lấy userId từ JWT claim(tuỳ bạn đang lưu claim kiểu gì)
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? User.FindFirstValue("userId");

            //if (!int.TryParse(userIdStr, out var userId))
            //    return Unauthorized(new { message = "Invalid user identity." });

            try
            {
                var result = await _service.CreateAsync(request, userID, ct);
                return CreatedAtAction(nameof(GetPlanById), new { id = result.StockTakeId }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Optional để FE dễ gọi sau khi create
        [HttpGet("plans/{id:int}")]
        public IActionResult GetPlanById([FromRoute] int id)
        {
            // Bạn có thể implement sau. Tạm thời để CreatedAtAction không lỗi route.
            return Ok(new { id });
        }
    }
}
