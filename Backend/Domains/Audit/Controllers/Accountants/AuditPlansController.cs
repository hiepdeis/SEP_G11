using Backend.Domains.Audit.DTOs.Accountants;
using Backend.Domains.Audit.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountants/audits")]
    [Authorize(Roles = "Accountant,Admin")]
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
        public async Task<IActionResult> GetPlanById([FromRoute] int id, CancellationToken ct)
        {
            try
            {
                var result = await _service.GetByIdAsync(id, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        //[HttpDelete("plans/{stockTakeId:int}/bin-locations/{binId:int}")]
        //public async Task<IActionResult> DeleteBinLocation([FromRoute] int stockTakeId, [FromRoute] int binId, CancellationToken ct)
        //{
        //    try
        //    {
        //        await _service.DeleteBinLocationAsync(stockTakeId, binId, ct);
        //        return Ok(new { message = "BinLocation deleted successfully." });
        //    }
        //    catch (ArgumentException ex)
        //    {
        //        return BadRequest(new { message = ex.Message });
        //    }
        //}

        [HttpPut("plans/{id:int}")]
        public async Task<IActionResult> UpdatePlan([FromRoute] int id, [FromBody] UpdateAuditPlanRequest request, CancellationToken ct)
        {
            try
            {
                var result = await _service.UpdateAsync(id, request, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("plans/{id:int}")]
        public async Task<IActionResult> DeletePlan([FromRoute] int id, CancellationToken ct)
        {
            try
            {
                await _service.DeleteAsync(id, ct);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
