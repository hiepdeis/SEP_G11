using Backend.Data;
using Backend.Domains.outbound.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Entities;


namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IssueSlipsController : ControllerBase
    {
        private readonly MyDbContext _context;

        public IssueSlipsController(MyDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetIssueSlipById(long id)
        {
            var issueSlip = await _context.IssueSlips.FindAsync(id);
            if (issueSlip == null)
            {
                return NotFound();
            }
            return Ok(issueSlip);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllIssueSlips()
        {
            var issueSlips = await _context.IssueSlips.ToListAsync();
            return Ok(issueSlips);
        }

        [HttpPost]
        public async Task<IActionResult> CreateIssueSlip(CreateIssueSlipDto dto)
        {
            if (dto == null)
            {
                return BadRequest("Invalid data.");
            }

            var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == dto.ProjectId);
            if (!projectExists)
            {
                return NotFound($"Project with ID {dto.ProjectId} not found.");
            }

            var issueSlip = new IssueSlip
            {
                IssueCode = dto.IssueCode,
                ProjectId = dto.ProjectId,
                CreatedBy = dto.UserId,
                IssueDate = DateTime.UtcNow,
                Status = "Pending",
                Description = dto.Description,
            };

            _context.IssueSlips.Add(issueSlip);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIssueSlipById), new { id = issueSlip.IssueId }, issueSlip);
            // Implementation for creating an issue slip goes here
        }


        [HttpPut("{id}/approve")]
        //[Authorize(Roles = "Manager")]
        public async Task<IActionResult> ApproveIssueSlip(long id)
        {
            var issue = await _context.IssueSlips.FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            // 2. Check trạng thái
            if (issue.Status != "Pending")
                return BadRequest("Only Pending IssueSlip can be approved");

            // 3. Approve
            issue.Status = "Approved";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                issue.IssueId,
                issue.IssueCode,
                issue.Status
            });
        }

        [HttpPost("{issueId}/details")]
        public async Task<IActionResult> AddIssueDetails(long issueId, List<CreateIssueDetailDto> details)
        {
            var issueSlip = await _context.IssueSlips.FindAsync(issueId);
            if (issueSlip == null)
            {
                return NotFound("IssueSlip not found");
            }

            if (details == null || !details.Any())
                return BadRequest("Issue details is empty");

            // 3. Map DTO -> Entity
            var issueDetails = details.Select(d => new IssueDetail
            {
                IssueId = issueId,
                MaterialId = d.MaterialId,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice
            }).ToList();

            // 4. Insert
            _context.IssueDetails.AddRange(issueDetails);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                IssueId = issueId,
                TotalItems = issueDetails.Count
            });

        }
    }
}
