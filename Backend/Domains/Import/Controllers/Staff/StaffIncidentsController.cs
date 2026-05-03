using Backend.Domains.Import.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Staff
{
    [ApiController]
    [Route("api/staff/incidents")]
    [Authorize(Roles = "WarehouseStaff, WarehouseManager, Admin", Policy = "ActiveUserOnly")]
    public class StaffIncidentsController : ControllerBase
    {
        private readonly IIncidentWorkflowService _service;

        public StaffIncidentsController(IIncidentWorkflowService service)
        {
            _service = service;
        }

        private int GetStaffId()
        {
            return User.GetRequiredUserId();
        }

        [HttpPost("{incidentId:long}/submit-to-manager")]
        public async Task<IActionResult> SubmitToManager(long incidentId)
        {
            try
            {
                var staffId = GetStaffId();
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
