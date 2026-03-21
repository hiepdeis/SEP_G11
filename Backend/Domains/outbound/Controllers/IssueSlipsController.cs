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
            var issueSlips = await _context.IssueSlips
                .Include(x => x.Project) 
                .Select(x => new
                {
                    x.IssueId,
                    x.IssueCode,
                    x.ProjectId,
                    ProjectName = x.Project.Name, 
                    x.WarehouseId,
                    x.ParentIssueId,
                    x.CreatedBy,
                    x.IssueDate,
                    x.Status,
                    x.Description,
                    x.ApprovedDate,
                    x.WorkItem,
                    x.Department,
                    x.DeliveryLocation,
                    x.ReferenceCode
                })
                .ToListAsync();
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
                Status = "Pending_Review",
                Description = dto.Description,
                WorkItem = dto.WorkItem,
                Department = dto.Department,
                DeliveryLocation = dto.DeliveryLocation,
                ReferenceCode = dto.ReferenceCode
            };

            _context.IssueSlips.Add(issueSlip);
            await _context.SaveChangesAsync();

            var approvalSteps = new List<IssueSlipApproval>
            {
                new IssueSlipApproval
                {
                    IssueId = issueSlip.IssueId,
                    Step = "Accountant",
                    StepOrder = 1,
                    Status = "Pending",
                    IsActive = true
                },
                new IssueSlipApproval
                {
                    IssueId = issueSlip.IssueId,
                    Step = "Admin",
                    StepOrder = 2,
                    Status = "Pending",
                    IsActive = false // ❗ mặc định tắt
                },
                new IssueSlipApproval
                {
                    IssueId = issueSlip.IssueId,
                    Step = "WarehouseManager",
                    StepOrder = 3,
                    Status = "Pending",
                    IsActive = true
                },
                new IssueSlipApproval
                {
                    IssueId = issueSlip.IssueId,
                    Step = "WarehouseStaff",
                    StepOrder = 4,
                    Status = "Pending",
                    IsActive = true
                }
            };

            _context.IssueSlipApprovals.AddRange(approvalSteps);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                issueId = issueSlip.IssueId,
                issueCode = issueSlip.IssueCode
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

        [HttpGet("{id}/details")]
        // [Authorize(Roles = "Accountant, Admin")]
        public async Task<IActionResult> GetIssueSlipDetail(long id)
        {
            // 1. Query lấy phiếu, kèm theo dự án và chi tiết vật tư
            var issue = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.Material) // Join để lấy Đơn giá
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            // 2. Tính tổng tiền của Phiếu xin xuất này (Số lượng * Giá hiện tại)
            decimal totalRequestCost = issue.IssueDetails
                .Sum(d => d.Quantity * (d.Material.UnitPrice ?? 0));

            // 3. Lấy thông tin Budget từ Project
            decimal totalBudget = issue.Project.Budget ?? 0;
            decimal budgetUsed = issue.Project.BudgetUsed ?? 0; // Cột bạn vừa add
            decimal budgetRemaining = totalBudget - budgetUsed; // Có thể xài luôn issue.Project.BudgetRemaining nếu bạn map EF

            // 4. Check xem có vượt ngân sách không
            bool isOverBudget = totalRequestCost > budgetRemaining;

            // 5. Trả về DTO cho Frontend
            var response = new
            {
                issue.IssueId,
                issue.IssueCode,
                issue.Status,
                issue.IssueDate,
                issue.WorkItem,
                ProjectInfo = new
                {
                    issue.Project.ProjectId,
                    issue.Project.Name,
                    TotalBudget = totalBudget,
                    BudgetUsed = budgetUsed,
                    BudgetRemaining = budgetRemaining,
                    TotalRequestCost = totalRequestCost,
                    RemainingAfterIssue = budgetRemaining - totalRequestCost,
                    IsOverBudget = isOverBudget
                },
                Details = issue.IssueDetails.Select(d => new
                {
                    d.DetailId,
                    d.Material.Code,
                    d.Material.Name,
                    d.Quantity,
                    UnitPrice = d.Material.UnitPrice ?? 0,
                    LineTotal = d.Quantity * (d.Material.UnitPrice ?? 0)
                })
            };

            return Ok(response);
        }


        [HttpPut("{id}/review")]
        // [Authorize(Roles = "Accountant")]
        public async Task<IActionResult> ReviewIssue(long id, [FromBody] ReviewIssueRequest request)
        {
            var issue = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.Material)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            // Chỉ cho phép Kế toán review phiếu đang ở trạng thái chờ
            if (issue.Status != "Pending_Review")
                return BadRequest("Only Pending_Review IssueSlip can be reviewed by Accountant");

            if (request.Action == "Rejected")
            {
                // Nhánh 1: Kế toán thấy sai, đuổi về thẳng!
                issue.Status = "Rejected";
                issue.Description = request.Reason;
            }
            else if (request.Action == "Approved")
            {
                // Nhánh 2: Kế toán thấy số liệu ok. Bắt đầu Check Budget Tự Động!

                decimal totalRequestCost = issue.IssueDetails.Sum(d => d.Quantity * (d.Material.UnitPrice ?? 0));
                decimal budgetRemaining = (issue.Project.Budget ?? 0) - (issue.Project.BudgetUsed ?? 0);

                if (totalRequestCost > budgetRemaining)
                {
                    // TÌNH HUỐNG A: VƯỢT NGÂN SÁCH
                    // Tự động đá trạng thái lên cho Admin duyệt
                    issue.Status = "Pending_Admin_Approval";
                    issue.Description = "Hệ thống cảnh báo: Yêu cầu vượt ngân sách dự án. Chờ Giám đốc phê duyệt.";
                }
                else
                {
                    // TÌNH HUỐNG B: TRONG NGÂN SÁCH
                    // Tự động Pass luôn, chuyển sang cho Kho soạn hàng
                    issue.Status = "Approved";
                    issue.ApprovedDate = DateTime.UtcNow;
                    issue.Description = "Kế toán đã duyệt (Trong ngân sách).";
                }
            }
            else
            {
                return BadRequest("Invalid action. Must be 'Approved' or 'Rejected'");
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                issue.IssueId,
                issue.IssueCode,
                NewStatus = issue.Status,
                Message = issue.Status == "Pending_Admin_Approval"
                          ? "Đã chuyển cho Giám đốc duyệt do vượt ngân sách."
                          : "Đã xử lý thành công."
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
