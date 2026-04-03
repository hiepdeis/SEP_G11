using Backend.Domains.Admin.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Admin.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public sealed class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;

        public DashboardController(IDashboardService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var result = await _service.GetDashboardAsync(ct);
            return Ok(result);
        }
    }
}