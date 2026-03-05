using Backend.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryIssuesController : ControllerBase
    {
        private readonly MyDbContext _context;

        public InventoryIssuesController(MyDbContext context)
        {
            _context = context;
        }

        // GET /api/inventory-issues?status=Processing
        [HttpGet]
        public async Task<IActionResult> GetInventoryIssues([FromQuery] string? status)
        {
            var query = _context.InventoryIssues
                                .Include(x => x.IssueSlip)
                                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(x => x.Status == status);
            }

            var data = await query
                .OrderByDescending(x => x.CreatedDate)
                .Select(x => new
                {
                    inventoryIssueId = x.Id,
                    issueCode = x.IssueCode,
                    createdDate = x.CreatedDate,
                    status = x.Status,

                    issueSlipId = x.IssueSlipId,
                    issueSlipCode = x.IssueSlip.IssueCode,
                    projectName = x.IssueSlip.Project.Name
                })
                .ToListAsync();

            return Ok(data);
        }


        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetInventoryIssueById(long id)
        {
            var inventoryIssue = await _context.InventoryIssues
                .Include(ii => ii.Details)
                    .ThenInclude(d => d.IssueDetail)
                        .ThenInclude(idt => idt.Material)
                .Include(ii => ii.Details)
                    .ThenInclude(d => d.Batch)
                .FirstOrDefaultAsync(ii => ii.Id == id);
                

            if (inventoryIssue == null)
                return NotFound();

            var result = new
            {
                id = inventoryIssue.Id,
                issueCode = inventoryIssue.IssueCode,
                status = inventoryIssue.Status,
                details = inventoryIssue.Details.Select(d =>
                {
                    var current = _context.InventoryCurrents
                        .Include(ic => ic.Bin)
                        .FirstOrDefault(ic =>
                            ic.BatchId == d.BatchId &&
                            ic.MaterialId == d.IssueDetail.Material.MaterialId);

                    return new
                    {
                        materialName = d.IssueDetail.Material.Name,
                        batchCode = d.Batch.BatchCode,
                        allocatedQuantity = d.Quantity,
                        binCode = current?.Bin?.Code
                    };
                })
            };

            return Ok(result);
        }


        [HttpPut("{id}/dispatch")]
        public async Task<IActionResult> Dispatch(long id)
        {
            var issue = await _context.InventoryIssues
                .Include(i => i.Details)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (issue == null)
                return NotFound();

            if (issue.Status != "Processing")
                return BadRequest("Only Processing issues can be dispatched.");

            issue.Status = "Delivering";

            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
