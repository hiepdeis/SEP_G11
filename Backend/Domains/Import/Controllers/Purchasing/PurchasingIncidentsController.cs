using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Purchasing
{
    [ApiController]
    [Route("api/purchasing/incidents")]
    public class PurchasingIncidentsController : ControllerBase
    {
        private readonly IIncidentWorkflowService _service;

        public PurchasingIncidentsController(IIncidentWorkflowService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingIncidents()
        {
            try
            {
                var incidents = await _service.GetPurchasingIncidentsAsync();
                return Ok(incidents);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{incidentId:long}")]
        public async Task<IActionResult> GetIncidentDetail(long incidentId)
        {
            try
            {
                var incident = await _service.GetPurchasingIncidentAsync(incidentId);
                return Ok(incident);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("{incidentId:long}/supplementary-receipt")]
        public async Task<IActionResult> CreateSupplementaryReceipt(long incidentId, [FromBody] CreateSupplementaryReceiptDto dto)
        {
            try
            {
                var purchasingId = 1; // TODO: replace with JWT claims
                var result = await _service.CreateSupplementaryReceiptAsync(incidentId, purchasingId, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
