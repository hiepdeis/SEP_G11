using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Backend.Domains.outbound.Dtos;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class IssueSlipDetailsController : ControllerBase
    {

        private readonly MyDbContext _context;
        private readonly IAuditLockCheckService _auditLockCheck;

        public IssueSlipDetailsController(MyDbContext context, IAuditLockCheckService auditLockCheck)
        {
            _context = context;
            _auditLockCheck = auditLockCheck;
        }


        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetIssueSlipById(long id)
        {
            var issueSlip = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.Warehouse)
                .Include(x => x.CreatedByNavigation)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issueSlip == null)
                return NotFound();

            var details = await _context.IssueDetails
                .Where(d => d.IssueId == id)
                .Include(d => d.Material)
                .Select(d => new
                {
                    d.DetailId,
                    d.MaterialId,
                    d.Material.Name,
                    d.Material.Unit,
                    RequestedQty = d.Quantity
                })
                .ToListAsync();

            var materialIds = details.Select(d => d.MaterialId).ToList();

            var inventory = await _context.InventoryCurrents
                .Where(i => materialIds.Contains(i.MaterialId))
                .GroupBy(i => i.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    TotalStock = g.Sum(x => x.QuantityOnHand ?? 0)
                })
                .ToListAsync();

            var detailDtos = details.Select(d =>
            {
                var stock = inventory.FirstOrDefault(i => i.MaterialId == d.MaterialId)?.TotalStock ?? 0;
                var isEnough = stock >= d.RequestedQty;
                var message = isEnough
                    ? "Đủ hàng"
                    : $"Thiếu {Math.Abs(stock - d.RequestedQty)} {d.Unit ?? ""}".Trim();

                return new IssueSlipMaterialDetailDto
                {
                    DetailId = d.DetailId,
                    MaterialId = d.MaterialId,
                    MaterialName = d.Name,
                    Unit = d.Unit,
                    RequestedQty = d.RequestedQty,
                    TotalStock = stock,
                    IsEnough = isEnough,
                    Message = message
                };
            }).ToList();

            var dto = new IssueSlipDetailDto
            {
                IssueId = issueSlip.IssueId,
                IssueCode = issueSlip.IssueCode,
                ProjectId = issueSlip.ProjectId,
                ProjectName = issueSlip.Project.Name,
                WarehouseId = issueSlip.WarehouseId,
                WarehouseName = issueSlip.Warehouse?.Name,
                IssueDate = issueSlip.IssueDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
                Status = issueSlip.Status,
                CreatedBy = issueSlip.CreatedBy,
                CreatedByName = issueSlip.CreatedByNavigation.FullName ?? issueSlip.CreatedByNavigation.Username,
                Description = issueSlip.Description,
                Details = detailDtos
            };

            return Ok(dto);
        }



        [HttpGet("{id}/allocation")]
        public async Task<IActionResult> GetAllocation(long id)
        {
            var issue = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.Material)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            if (issue.Status != "Approved")
                return BadRequest("Only Approved IssueSlip can allocate");

            var materialIds = issue.IssueDetails
                .Select(d => d.MaterialId)
                .Distinct()
                .ToList();

            var inventories = await _context.InventoryCurrents
                .Include(x => x.Batch)
                .Where(x => materialIds.Contains(x.MaterialId)
                         && x.QuantityOnHand > 0)
                .ToListAsync();

            var items = new List<object>();

            foreach (var detail in issue.IssueDetails)
            {
                var materialStock = inventories
                    .Where(i => i.MaterialId == detail.MaterialId)
                    .OrderBy(i => i.Batch.CreatedDate) // FIFO
                    .ToList();

                decimal requestedQty = detail.Quantity;
                decimal remaining = requestedQty;

                // ===== TÍNH TOTAL AVAILABLE =====
                decimal totalAvailable = materialStock.Sum(i =>
                    (i.QuantityOnHand ?? 0m) - (i.QuantityAllocated ?? 0m)
                );

                // ===== FIFO SUGGEST =====
                var suggested = new List<object>();

                foreach (var batch in materialStock)
                {
                    if (remaining <= 0) break;

                    decimal onHand = batch.QuantityOnHand ?? 0m;
                    decimal allocated = batch.QuantityAllocated ?? 0m;
                    decimal available = onHand - allocated;

                    if (available <= 0)
                        continue;

                    decimal takeQty = Math.Min(available, remaining);

                    suggested.Add(new
                    {
                        batchId = batch.BatchId,
                        batchCode = batch.Batch.BatchCode,
                        qty = takeQty
                    });

                    remaining -= takeQty;
                }

                items.Add(new
                {
                    detailId = detail.DetailId,
                    materialId = detail.MaterialId,
                    materialName = detail.Material.Name,
                    Unit = detail.Material.Unit,
                    requestedQty = requestedQty,
                    totalAvailable = totalAvailable,
                    isEnough = totalAvailable >= requestedQty,

                    // Dropdown
                    availableBatches = materialStock
                        .Select(b =>
                        {
                            decimal available =
                                (b.QuantityOnHand ?? 0m) -
                                (b.QuantityAllocated ?? 0m);

                            return new
                            {
                                batchId = b.BatchId,
                                batchCode = b.Batch.BatchCode,
                                availableQty = available,
                                receivedDate = b.Batch.CreatedDate
                            };
                        })
                        .Where(b => b.availableQty > 0),

                    // Auto FIFO
                    suggestedAllocation = suggested
                });
            }

            bool isAllEnough = items.All(x => (bool)x.GetType()
                .GetProperty("isEnough")!
                .GetValue(x)!);

            bool hasShortage = !isAllEnough;

            var response = new
            {
                issueId = issue.IssueId,
                issueCode = issue.IssueCode,
                projectName = issue.Project.Name,
                status = issue.Status,
                items = items,
                isAllEnough = isAllEnough,
                hasShortage = hasShortage
            };

            return Ok(response);
        }

        [HttpPost("{id}/process")]
        public async Task<IActionResult> ProcessIssue(long id, [FromBody] ProcessIssueRequest request)
        {
            if (request.Items == null || !request.Items.Any())
                return BadRequest("No items provided.");

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // ===== 1. LOAD ISSUE =====
                var issue = await _context.IssueSlips
                    .Include(x => x.IssueDetails)
                    .FirstOrDefaultAsync(x => x.IssueId == id);

                if (issue == null)
                    return NotFound("IssueSlip not found.");

                if (issue.Status != "Approved")
                    return BadRequest("IssueSlip must be Approved.");

                // ===== 2. VALIDATE STOCK =====
                foreach (var item in request.Items)
                {
                    var detail = issue.IssueDetails
                        .FirstOrDefault(d => d.DetailId == item.DetailId);

                    if (detail == null)
                        return BadRequest($"Invalid DetailId {item.DetailId}");

                    var inventory = await _context.InventoryCurrents
                        .FirstOrDefaultAsync(x =>
                            x.MaterialId == detail.MaterialId &&
                            x.BatchId == item.BatchId);

                    if (inventory == null)
                        return BadRequest($"Batch {item.BatchId} not found.");

                    decimal available =
                        (inventory.QuantityOnHand ?? 0m) -
                        (inventory.QuantityAllocated ?? 0m);

                    if (available < item.Quantity)
                        return BadRequest(
                            $"Batch {item.BatchId} does not have enough stock.");
                }

                // ===== 3. CREATE INVENTORY ISSUE =====
                var inventoryIssue = new InventoryIssue
                {
                    IssueSlipId = issue.IssueId,
                    IssueCode = "WH-" + DateTime.Now.ToString("yyyyMMddHHmmss"),
                    CreatedDate = DateTime.Now,
                    Status = "Processing"
                };
                
                _context.InventoryIssues.Add(inventoryIssue);
                await _context.SaveChangesAsync();

                // ===== 4. CREATE DETAILS + ALLOCATE =====
                foreach (var item in request.Items)
                {
                    var detail = issue.IssueDetails
                        .First(d => d.DetailId == item.DetailId);

                    var inventory = await _context.InventoryCurrents
                        .FirstAsync(x =>
                            x.MaterialId == detail.MaterialId &&
                            x.BatchId == item.BatchId);

                    // Tăng Allocated
                    // Check if this bin is locked by an active audit before allocating
                    if (inventory.WarehouseId.HasValue)
                    {
                        var isLocked = await _auditLockCheck.IsBinLockedAsync(inventory.WarehouseId.Value, inventory.BinId, default);
                        if (isLocked)
                            return BadRequest($"Vị trí kệ đang bị khóa để kiểm kê (audit). Không thể xuất hàng từ vị trí này.");
                    }

                    inventory.QuantityAllocated =
                        (inventory.QuantityAllocated ?? 0m) + item.Quantity;

                    var issueDetail = new InventoryIssueDetail
                    {
                        InventoryIssueId = inventoryIssue.Id,
                        IssueDetailId = item.DetailId,
                        BatchId = item.BatchId,
                        Quantity = item.Quantity
                    };

                    _context.InventoryIssueDetails.Add(issueDetail);
                }

                // ===== 5. UPDATE ISSUE SLIP STATUS =====
                issue.Status = "Processing";

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Inventory Issue created successfully.",
                    inventoryIssueId = inventoryIssue.Id,
                    issueCode = inventoryIssue.IssueCode
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(ex.Message);
            }
        }
    }
}
