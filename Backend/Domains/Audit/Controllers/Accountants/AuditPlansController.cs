using Backend.Domains.Audit.DTOs.Accountants;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountants/audits")]
    [Authorize(Roles = "Accountant")]
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
            var userId = User.GetRequiredUserId();

            try
            {
                var result = await _service.CreateAsync(request, userId, ct);
                return CreatedAtAction(nameof(GetPlanById), new { id = result.StockTakeId }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("plans/{id:int}")]
        public IActionResult GetPlanById([FromRoute] int id)
        {
            return Ok(new { id });
        }

        [HttpDelete("plans/{stockTakeId:int}/bin-locations/{binId:int}")]
        public async Task<IActionResult> DeleteBinLocation([FromRoute] int stockTakeId, [FromRoute] int binId, CancellationToken ct)
        {
            try
            {
                await _service.DeleteBinLocationAsync(stockTakeId, binId, ct);
                return Ok(new { message = "BinLocation deleted successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("plans/{stockTakeId:int}/bin-locations")]
        public async Task<IActionResult> UpdateBinLocations([FromRoute] int stockTakeId, [FromBody] UpdateBinLocationsRequest request, CancellationToken ct)
        {
            try
            {
                var result = await _service.UpdateBinLocationsAsync(stockTakeId, request, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
