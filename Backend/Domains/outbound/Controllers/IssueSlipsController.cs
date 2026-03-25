using Backend.Data;
using Backend.Domains.outbound.Dtos;
using Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;


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

            var isStockTakeActive = await _context.StockTakeLocks.AnyAsync(l => l.IsActive);
            if (isStockTakeActive)
            {
                return StatusCode(StatusCodes.Status409Conflict, "A stock take is currently in progress. Material issue requests cannot be created at this time.");
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
                WorkItem = dto.WorkItem,
                Department = dto.Department,
                DeliveryLocation = dto.DeliveryLocation,
                ReferenceCode = dto.ReferenceCode
            };

            _context.IssueSlips.Add(issueSlip);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIssueSlipById), new { id = issueSlip.IssueId }, issueSlip);
            // Implementation for creating an issue slip goes here
        }


        [HttpPut("{id}/review")]
       // [Authorize(Roles = "Manager")]
        public async Task<IActionResult> ReviewIssue(long id, ReviewIssueRequest request)
        {
            var issue = await _context.IssueSlips
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            if (issue.Status != "Pending")
                return BadRequest("Only Pending IssueSlip can be reviewed");

            if (request.Action != "Approved" && request.Action != "Rejected")
                return BadRequest("Invalid action");

            issue.Status = request.Action;
            issue.Description = request.Action == "Rejected"
                ? request.Reason
                : null;
            issue.ApprovedDate = issue.Status == "Approved" ? DateTime.UtcNow : (DateTime?)null;

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



        [HttpGet("list")]
        public async Task<IActionResult> GetIssueSlips([FromQuery] string? status)
        {
            var query = _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.Warehouse)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(x => x.Status == status);

            var result = await query
                .Select(x => new IssueSlipListDto
                {
                    IssueId = x.IssueId,
                    IssueCode = x.IssueCode,
                    ProjectName = x.Project.Name,
                    WarehouseName = x.Warehouse.Name,
                    IssueDate = x.IssueDate.HasValue ? x.IssueDate.Value.ToString("yyyy-MM-dd") : null,
                    Status = x.Status
                })
                .ToListAsync();

            return Ok(result);
        }

        
        [HttpGet("approved-list")]
        public async Task<IActionResult> GetApprovedIssueSlips()
        {
            var issues = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.CreatedByNavigation) 
                .Where(x => x.Status == "Approved")
                .Select(x => new
                {
                    x.IssueId,
                    x.IssueCode,                           
                    ProjectName = x.Project.Name,
                    RequestedBy = x.CreatedByNavigation.FullName,
                    x.ApprovedDate
                })
                .ToListAsync();

            return Ok(issues);
        }





    }
}
