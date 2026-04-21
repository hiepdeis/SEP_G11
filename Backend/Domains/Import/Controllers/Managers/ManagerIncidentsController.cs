using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Managers
{
    [ApiController]
    [Route("api/manager/incidents")]
    [Authorize(Roles = "WarehouseManager", Policy = "ActiveUserOnly")]
    public class ManagerIncidentsController : ControllerBase
    {
        private readonly IIncidentWorkflowService _service;

        public ManagerIncidentsController(IIncidentWorkflowService service)
        {
            _service = service;
        }

        private int GetManagerId()
        {
            return User.GetRequiredUserId();
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingIncidents()
        {
            try
            {
                var incidents = await _service.GetManagerIncidentsAsync();
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
                var incident = await _service.GetManagerIncidentAsync(incidentId);
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

        [HttpPost("{incidentId:long}/approve")]
        public async Task<IActionResult> ApproveIncident(long incidentId, [FromBody] ManagerApproveIncidentDto dto)
        {
            try
            {
                var managerId = GetManagerId();
                var incident = await _service.ApproveIncidentAsync(incidentId, managerId, dto.Notes);

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

        [HttpGet("{incidentId:long}/supplementary-receipt")]
        public async Task<IActionResult> GetSupplementaryReceipt(long incidentId)
        {
            try
            {
                var receipt = await _service.GetSupplementaryReceiptAsync(incidentId);
                return Ok(receipt);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("{incidentId:long}/approve-supplementary")]
        public async Task<IActionResult> ApproveSupplementaryReceipt(
            long incidentId,
            [FromBody] ManagerApproveSupplementaryDto dto)
        {
            try
            {
                var managerId = GetManagerId();
                var result = await _service.ApproveSupplementaryReceiptAsync(incidentId, managerId, dto.Notes);
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

        [HttpPost("{incidentId:long}/reject-supplementary")]
        public async Task<IActionResult> RejectSupplementaryReceipt(
            long incidentId,
            [FromBody] ManagerRejectSupplementaryDto dto)
        {
            try
            {
                var managerId = GetManagerId();
                var result = await _service.RejectSupplementaryReceiptAsync(incidentId, managerId, dto.Reason);
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
