using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Staff
{
    [ApiController]
    [Route("api/staff/incidents")]
    public class StaffIncidentsController : ControllerBase
    {
        private readonly IIncidentWorkflowService _service;

        public StaffIncidentsController(IIncidentWorkflowService service)
        {
            _service = service;
        }

        [HttpPost("{incidentId:long}/submit-to-manager")]
        public async Task<IActionResult> SubmitToManager(long incidentId)
        {
            try
            {
                var staffId = 4; // TODO: replace with JWT claims
                var incident = await _service.SubmitIncidentToManagerAsync(incidentId, staffId);

                return Ok(new
                {
                    status = incident.Status
                });
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
