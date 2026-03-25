using Backend.Domains.Projects.DTOs;
using Backend.Domains.Projects.Interfaces;
using Backend.Domains.Projects.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/accountants/projects")]
    // [Authorize(Roles = "Accountant,Admin")]
    public class ProjectController : ControllerBase
    {
        private readonly IProjectService _service;

        public ProjectController(IProjectService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var data = await _service.GetAllProjectsAsync(ct);
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectRequest request, CancellationToken ct)
        {
            var result = await _service.CreateProjectAsync(request, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectRequest request, CancellationToken ct)
        {
            var result = await _service.UpdateProjectAsync(id, request, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var result = await _service.DeleteProjectAsync(id, ct);
            if (!result.success) return BadRequest(new { message = result.message });
            return Ok(new { message = result.message });
        }

        [HttpGet("statuses")]
        public IActionResult GetStatuses()
        {
            return Ok(ProjectStatus.AllStatuses);
        }
    }
}