using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryIssuesController : ControllerBase
    {
        private readonly MyDbContext _context;
        private readonly IAuditLockCheckService _auditLockCheck;

        public InventoryIssuesController(MyDbContext context, IAuditLockCheckService auditLockCheck)
        {
            _context = context;
            _auditLockCheck = auditLockCheck;
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

            issue.IssueSlip.Status = "Delivering";

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("{issueSlipId}/acknowledge")]
        public async Task<IActionResult> AcknowledgeIssueSlip(long issueSlipId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Load IssueSlip with InventoryIssue and InventoryIssueDetails
                var inventoryIssue = await _context.InventoryIssues
                              .Include(x => x.IssueSlip)
                              .Include(x => x.Details)
                                  .ThenInclude(d => d.IssueDetail)
                              .FirstOrDefaultAsync(x => x.IssueSlipId == issueSlipId);

                if (inventoryIssue == null)
                    return BadRequest("InventoryIssue not found.");

                var issueSlip = inventoryIssue.IssueSlip;

                if (issueSlip.Status != "Delivering")
                    return BadRequest("IssueSlip must be Delivering.");

                // update status
                issueSlip.Status = "Completed";
                inventoryIssue.Status = "Completed";


                // 3. Process each InventoryIssueDetail
                foreach (var detail in inventoryIssue.Details)
                {
                    var inventoryCurrent = await _context.InventoryCurrents
                        .FirstOrDefaultAsync(ic =>
                            ic.MaterialId == detail.IssueDetail.MaterialId &&
                            ic.BatchId == detail.BatchId);

                    if (inventoryCurrent == null)
                        return BadRequest($"InventoryCurrent not found for MaterialId {detail.IssueDetail.MaterialId}, BatchId {detail.BatchId}.");

                    if ((inventoryCurrent.QuantityAllocated ?? 0) < detail.Quantity)
                        return BadRequest($"Not enough allocated stock for MaterialId {detail.IssueDetail.MaterialId}, BatchId {detail.BatchId}.");

                    // Check if this bin is locked by an active audit before deducting
                    if (inventoryCurrent.WarehouseId.HasValue)
                    {
                        var isLocked = await _auditLockCheck.IsBinLockedAsync(inventoryCurrent.WarehouseId.Value, inventoryCurrent.BinId, default);
                        if (isLocked)
                            return BadRequest($"Vị trí kệ đang bị khóa để kiểm kê (audit). Không thể xuất hàng lúc này.");
                    }

                    inventoryCurrent.QuantityAllocated -= detail.Quantity;
                    inventoryCurrent.QuantityOnHand -= detail.Quantity;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "IssueSlip acknowledged and inventory updated successfully." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(ex.Message);
            }
        }

    }
}
