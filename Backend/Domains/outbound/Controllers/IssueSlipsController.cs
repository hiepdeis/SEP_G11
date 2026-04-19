using Backend.Data;
using Backend.Domains.auth.Interfaces;
using Backend.Domains.auth.Services;
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
        private readonly IAuthService _authService;

        public IssueSlipsController(MyDbContext context, IAuthService auth)
        {
            _context = context;
            _authService = auth;
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
                .OrderByDescending(x => x.IssueDate)
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
                    IsActive = false 
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
                UnitPrice = d.UnitPrice,
                
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
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.PickingLists)
                        .ThenInclude(p => p.Batch)
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.PickingLists)
                .ThenInclude(p => p.Bin)
                .Include(x => x.CreatedByNavigation)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (issue == null)
                return NotFound("IssueSlip not found");

            var materialIds = issue.IssueDetails.Select(d => d.MaterialId).Distinct().ToList();

            // Query bảng InventoryCurrents để tính tổng tồn kho của các vật tư này TRONG KHO ĐANG CHỈ ĐỊNH
            var inventoryData = await _context.InventoryCurrents
                .Include(ic => ic.Batch)
                //.Where(ic => ic.WarehouseId == issue.WarehouseId && materialIds.Contains(ic.MaterialId))
                .Where(ic => materialIds.Contains(ic.MaterialId))
                .OrderBy(ic => ic.Batch.CreatedDate) // Sắp xếp FIFO cốt lõi ở đây!
                .GroupBy(ic => ic.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    // Tồn kho khả dụng = Tổng tồn kho thực tế - Tổng hàng đã giữ chỗ (nếu có)
                    AvailableQty = g.Sum(ic => (ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0))
                })
                .ToDictionaryAsync(x => x.MaterialId, x => x.AvailableQty);

            var inventoryRecords = await _context.InventoryCurrents
                .Include(ic => ic.Batch)
                .Where(ic => materialIds.Contains(ic.MaterialId) && ((ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0)) > 0)
                .OrderBy(ic => ic.Batch.CreatedDate) // Xếp từ cũ đến mới (FIFO)
                .ToListAsync();
            // 2. Tính tổng tiền của Phiếu xin xuất này (Số lượng * Giá hiện tại)
            decimal totalRequestCost = issue.IssueDetails
                .Sum(d => d.Quantity * (d.Material.UnitPrice ?? 0));

            // 3. Lấy thông tin Budget từ Project
            decimal totalBudget = issue.Project.Budget ?? 0;
            decimal budgetUsed = issue.Project.BudgetUsed ?? 0; // Cột bạn vừa add
            decimal budgetRemaining = totalBudget - budgetUsed; // Có thể xài luôn issue.Project.BudgetRemaining nếu bạn map EF

            // 4. Check xem có vượt ngân sách không
            bool isOverBudget = totalRequestCost > budgetRemaining;
            var childSlips = await _context.IssueSlips
                        .Where(s => s.ReferenceCode == issue.IssueCode && s.IssueId != issue.IssueId)
                        .Select(s => new { s.IssueId, s.IssueCode, s.Status })
                        .ToListAsync();

            var isSlip = childSlips.FirstOrDefault(s => s.IssueCode.StartsWith("IS-"));
            var poSlip = childSlips.FirstOrDefault(s => s.IssueCode.StartsWith("PO-"));

            var generatedSlips = childSlips.Any() ? new
            {
                inventoryId = isSlip?.IssueId,
                inventoryCode = isSlip?.IssueCode,
                // Nếu không còn là Draft thì nghĩa là Kế toán đã bấm Gửi rồi
                inventorySent = isSlip != null && isSlip.Status != "Draft_Issue_Note",

                poId = poSlip?.IssueId,
                poCode = poSlip?.IssueCode,
                poSent = poSlip != null && poSlip.Status != "Draft_Direct_PO"
            } : null;
            // 5. Trả về DTO cho Frontend
            var response = new
            {
                issue.IssueId,
                issue.IssueCode,
                issue.Status,
                issue.IssueDate,
                issue.WorkItem,
                issue.WarehouseId,
                issue.ReferenceCode,
                issue.Description,
                issue.DeliveryLocation,
                issue.Department,
                CreatedBy = new
                {
                    issue.CreatedBy,
                    Username = issue.CreatedByNavigation.Username 
                },
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

                // [BỔ SUNG] Ném cụm phiếu con này vào JSON trả về
                GeneratedSlips = generatedSlips,
                Details = issue.IssueDetails.Select(d =>
                {
                    decimal availableStock = inventoryData.ContainsKey(d.MaterialId) ? inventoryData[d.MaterialId] : 0;
                    var suggestedBatches = new List<object>();
                    decimal qtyNeeded = d.Quantity;
                    var batchesForThisMaterial = inventoryRecords.Where(ic => ic.MaterialId == d.MaterialId).ToList();

                    foreach (var inv in batchesForThisMaterial)
                    {
                        if (qtyNeeded <= 0) break; // Đủ hàng rồi thì ngừng cắt lô

                        decimal qtyInThisBatch = (inv.QuantityOnHand ?? 0) - (inv.QuantityAllocated ?? 0);
                        decimal qtyToTakeFromThisBatch = Math.Min(qtyNeeded, qtyInThisBatch);
                        decimal batchPrice = d.Material.UnitPrice ?? 0; // Giá lấy từ vật tư

                        suggestedBatches.Add(new
                        {
                            BatchId = inv.BatchId,
                            BatchCode = inv.Batch.BatchCode,
                            MfgDate = inv.Batch.MfgDate,
                            QtyToTake = qtyToTakeFromThisBatch,
                            UnitPrice = batchPrice,
                            LineTotal = qtyToTakeFromThisBatch * batchPrice
                        });

                        qtyNeeded -= qtyToTakeFromThisBatch;
                    }

                    return new
                    {
                        d.DetailId,
                        d.MaterialId,
                        d.Material.Code,
                        d.Material.Name,
                        d.Material.Unit,
                        RequestedQuantity = d.Quantity,
                        AvailableQuantity = availableStock,
                        IsStockSufficient = availableStock >= d.Quantity,
                        UnitPrice = d.Material.UnitPrice ?? 0,
                        LineTotal = d.Quantity * (d.Material.UnitPrice ?? 0),
                        FifoSuggestedBatches = suggestedBatches,
                        ActualPickingItems = d.PickingLists.Select(p => new
                        {
                            pickingId = p.PickingId,
                            materialCode = d.Material.Code,
                            materialName = d.Material.Name,
                            unit = d.Material.Unit,
                            batchCode = p.Batch.BatchCode,
                            binLocation = p.Bin.Code, 
                            qtyToPick = p.QtyToPick,
                            isPicked = p.IsPicked
                        }).ToList()
                    };
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
            if (issue.Status != "Pending_Review" && issue.Status != "Pending_Admin_Approval")
                return BadRequest("Only Pending_Review IssueSlip can be reviewed by Accountant");
            if (request.Action != "Approved" && request.Action != "Rejected")
                return BadRequest("Invalid action");
            var validActions = new[] { "Approved", "Rejected", "Ready_to_Pick" };
            if (!validActions.Contains(request.Action))
                return BadRequest("Hành động không hợp lệ.");
            if (request.Action == "Rejected")
            {
                // Nhánh 1: Kế toán thấy sai, đuổi về thẳng!
                issue.Status = "Rejected";
                issue.Description = request.Reason;

                await _context.SaveChangesAsync();
                return Ok(new { issue.IssueId, issue.IssueCode, NewStatus = issue.Status, Message = "Đã từ chối phiếu yêu cầu." });
            }
            else if (request.Action == "Approved")
            {
                // ----------------------------------------------------
                // CASE 1: ĐANG Ở TRẠM KẾ TOÁN (Pending_Review)
                // ----------------------------------------------------
                if (issue.Status == "Pending_Review")
                {
                    decimal totalRequestCost = issue.IssueDetails.Sum(d => d.Quantity * (d.Material.UnitPrice ?? 0));
                    decimal budgetRemaining = (issue.Project.Budget ?? 0) - (issue.Project.BudgetUsed ?? 0);

                    if (totalRequestCost > budgetRemaining)
                    {
                        // Vượt ngân sách -> Đẩy lên cho Admin
                        issue.Status = "Pending_Admin_Approval";
                        issue.Description = "Hệ thống cảnh báo: Yêu cầu vượt ngân sách dự án. Chờ Giám đốc phê duyệt.";
                    }
                    else
                    {
                        // Trong ngân sách -> Pass luôn, bật đèn xanh cho Kho
                        issue.Status = "Approved";
                        issue.ApprovedDate = DateTime.UtcNow;
                        issue.Description = "Kế toán đã duyệt (Trong ngân sách). Chờ xuất kho.";
                    }
                }
                // ----------------------------------------------------
                // CASE 2: ĐANG Ở TRẠM GIÁM ĐỐC (Pending_Admin_Approval)
                // ----------------------------------------------------
                else if (issue.Status == "Pending_Admin_Approval")
                {
                    decimal totalRequestCost = issue.IssueDetails.Sum(d => d.Quantity * (d.Material.UnitPrice ?? 0));

                    // Ngân sách hiện tại (bao gồm cả các khoản đội vốn đã duyệt trước đó)
                    decimal currentTotalBudget = (issue.Project.Budget ?? 0) + (issue.Project.OverBudgetAllowance ?? 0);
                    decimal budgetRemaining = currentTotalBudget - (issue.Project.BudgetUsed ?? 0);

                    // 2. Nếu thực sự lố, tự động nới rộng cột OverBudgetAllowance
                    if (totalRequestCost > budgetRemaining)
                    {
                        decimal overageAmount = totalRequestCost - budgetRemaining;

                        // CỘNG DỒN TIỀN ĐỘI VỐN VÀO DỰ ÁN
                        issue.Project.OverBudgetAllowance = (issue.Project.OverBudgetAllowance ?? 0) + overageAmount;
                    }
                    // Giám đốc đã soi xét và quyết định BẤM DUYỆT cho phép xuất lố
                    issue.Status = "Approved";
                    issue.ApprovedDate = DateTime.UtcNow;

                    // Cập nhật lại Note để sau này Audit (Kiểm toán) biết là Sếp Hiệp đã nhúng tay duyệt
                    issue.Description = "Giám đốc đã PHÊ DUYỆT XUẤT VƯỢT NGÂN SÁCH. Chờ xuất kho.";
                }
                else
                {
                    return BadRequest($"Không thể duyệt phiếu đang ở trạng thái: {issue.Status}");
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
                Message = "Xử lý duyệt thành công."
            });
        }


        [HttpGet("materials/{materialId}/batches-in-stock")]
        // [Authorize(Roles = "Accountant, WarehouseManager")]
        public async Task<IActionResult> GetBatchesInStock(int materialId, [FromQuery] int warehouseId)
        {
            // Tìm các lô đang có Tồn kho > 0
            var availableBatches = await _context.InventoryCurrents
                .Include(ic => ic.Batch)
                .Where(ic => ic.MaterialId == materialId
                          && ic.WarehouseId == warehouseId
                          && ((ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0)) > 0)
                .OrderBy(ic => ic.Batch.CreatedDate) // Vẫn ưu tiên show Lô cũ lên trên
                .Select(ic => new
                {
                    ic.BatchId,
                    BatchCode = ic.Batch.BatchCode,
                    MfgDate = ic.Batch.MfgDate,
                    CreatedDate = ic.Batch.CreatedDate,
                    AvailableQuantity = (ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0)
                    // Lấy thêm UnitPrice nếu bạn lưu ở bảng khác (vd: ReceiptDetails)
                })
                .ToListAsync();

            if (!availableBatches.Any())
            {
                return Ok(new { Message = "Vật tư này đang hết hàng trong kho.", Batches = new List<object>() });
            }

            return Ok(new
            {
                MaterialId = materialId,
                WarehouseId = warehouseId,
                TotalAvailable = availableBatches.Sum(b => b.AvailableQuantity),
                Batches = availableBatches
            });
        }

     
        [HttpPost("{id}/draft-process-inventory")]
        // [Authorize(Roles = "Accountant")]
        public async Task<IActionResult> ProcessDraftInventory(long id, [FromBody] ProcessDraftInventoryRequest request)
        {
            // 1. Lấy phiếu yêu cầu gốc
            var originalIssue = await _context.IssueSlips
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.Material)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (originalIssue == null) return NotFound("IssueSlip not found");
            if (originalIssue.Status != "Approved") return BadRequest("Phiếu chưa được duyệt ngân sách.");

            IssueSlip newInventorySlip = null; 
            IssueSlip newDirectPoSlip = null;

            // 2. Xử lý chia tách và giữ chỗ tồn kho
            foreach (var detail in originalIssue.IssueDetails)
            {
                var userDecision = request.Decisions.FirstOrDefault(d => d.DetailId == detail.DetailId);
                if (userDecision == null) continue;

                decimal originalRequestedQty = detail.Quantity;
                // Khởi tạo các biến để rõ ràng
                decimal stockToTake = 0;
                decimal poToBuy = 0;
                var allocatedBatches = request.CustomBatches != null && request.CustomBatches.ContainsKey(detail.DetailId)
                                       ? request.CustomBatches[detail.DetailId]
                                       : new List<FifoBatchDto>();

                // 2.2 TÍNH TOÁN SỐ LƯỢNG CHUẨN XÁC DỰA VÀO ACTION
                if (userDecision.Action == "DirectPO")
                {
                    // Mua thẳng 100% -> Không bốc ở kho
                    stockToTake = 0;
                    poToBuy = originalRequestedQty;
                }
                else if (userDecision.Action == "Stock" || userDecision.Action == "Split")
                {
                    // Lấy từ kho (toàn phần hoặc 1 phần) -> Tổng số lượng bốc từ các Lô
                    stockToTake = allocatedBatches.Sum(b => b.QtyToTake);
                    // Phần thiếu đi mua ngoài (Nếu đủ hàng thì poToBuy tự động = 0)
                    poToBuy = originalRequestedQty - stockToTake;
                }

                // ==================================================
                // GIỎ 1: TẠO PHIẾU XUẤT KHO MỚI (DRAFT ISSUE NOTE)
                // ==================================================
                if (stockToTake > 0)
                {
                    if (newInventorySlip == null)
                    {
                        newInventorySlip = new IssueSlip
                        {
                            ProjectId = originalIssue.ProjectId,
                            WarehouseId = originalIssue.WarehouseId,
                            CreatedBy = originalIssue.CreatedBy,
                            IssueDate = DateTime.UtcNow,
                            WorkItem = originalIssue.WorkItem,
                            Department = originalIssue.Department,
                            DeliveryLocation = originalIssue.DeliveryLocation,

                            // NỐI DÂY RỐN VỀ PHIẾU GỐC
                            ReferenceCode = originalIssue.IssueCode,
                            // MÃ PHIẾU MỚI: IS (Issue Slip)
                            IssueCode = "IS-" + DateTime.Now.ToString("yyMMdd") + "-" + new Random().Next(1000, 9999),
                            Status = "Draft_Issue_Note", // Trạng thái nháp
                            Description = $"Phiếu xuất kho tạo từ yêu cầu {originalIssue.IssueCode}.",
                            IssueDetails = new List<IssueDetail>()
                        };
                    }

                   
                    var newDetail = new IssueDetail
                    {
                        MaterialId = detail.MaterialId,
                        Quantity = stockToTake,
                        UnitPrice = detail.UnitPrice,
                        PickingLists = new List<PickingList>() 
                    };

                    // TIẾN HÀNH GIỮ CHỖ TỒN KHO THỰC TẾ & TẠO CHECKLIST NHẶT HÀNG
                    foreach (var batch in allocatedBatches)
                    {
                        var inventoryRecord = await _context.InventoryCurrents
                            .Include(ic => ic.Bin)
                            .FirstOrDefaultAsync(ic => ic.MaterialId == detail.MaterialId
                                                    && ic.BatchId == batch.BatchId);

                        if (inventoryRecord != null)
                        {
                            // A. Cập nhật tồn kho (Giữ chỗ)
                            inventoryRecord.QuantityAllocated = (inventoryRecord.QuantityAllocated ?? 0) + batch.QtyToTake;

                            // B. [MỚI] Đẻ ra 1 dòng Checklist nhặt hàng
                            newDetail.PickingLists.Add(new PickingList
                            {
                                BatchId = batch.BatchId,
                                BinId = inventoryRecord.Bin.BinId, // Lấy vị trí Kệ từ tồn kho
                                QtyToPick = batch.QtyToTake,
                                IsPicked = false, // Mặc định là chưa nhặt
                                ActualPickerId = null
                            });
                        }
                    }

                   
                    newInventorySlip.IssueDetails.Add(newDetail);

                }
                // ==================================================   
                // GIỎ 2: TẠO ĐƠN MUA NGOÀI MỚI (DRAFT DIRECT PO)
                // ==================================================
                if (poToBuy > 0)
                {

                    if (newDirectPoSlip == null)
                    {
                        newDirectPoSlip = new IssueSlip
                        {
                            ProjectId = originalIssue.ProjectId,
                            WarehouseId = originalIssue.WarehouseId,
                            CreatedBy = originalIssue.CreatedBy,
                            IssueDate = DateTime.UtcNow,
                            WorkItem = originalIssue.WorkItem,
                            Department = originalIssue.Department,
                            DeliveryLocation = originalIssue.DeliveryLocation,

                           
                            ReferenceCode = originalIssue.IssueCode,
                            // MÃ PHIẾU MỚI: PO (Purchase Order)
                            IssueCode = "PO-" + DateTime.Now.ToString("yyMMdd") + "-" + new Random().Next(1000, 9999),
                            Status = "Draft_Direct_PO", // Trạng thái nháp
                            Description = $"Đơn mua xuất thẳng tạo từ yêu cầu {originalIssue.IssueCode}.",
                            IssueDetails = new List<IssueDetail>()
                        };
                    }

                    // Gắp hàng thiếu bỏ vào Đơn mua
                    newDirectPoSlip.IssueDetails.Add(new IssueDetail
                    {
                        MaterialId = detail.MaterialId,
                        Quantity = poToBuy,
                        UnitPrice = detail.UnitPrice
                    });
                }
            }  

            // 3. LƯU CÁC PHIẾU MỚI VÀO DATABASE
            if (newInventorySlip != null) _context.IssueSlips.Add(newInventorySlip);
            if (newDirectPoSlip != null) _context.IssueSlips.Add(newDirectPoSlip);

            // 4. CHỐT SỔ PHIẾU GỐC (Không thay đổi số lượng, chỉ đổi trạng thái)
            originalIssue.Status = "Processed"; // Trạng thái: Đã xử lý phân bổ
                string logIS = newInventorySlip != null ? newInventorySlip.IssueCode : "Không";
                string logPO = newDirectPoSlip != null ? newDirectPoSlip.IssueCode : "Không";
                originalIssue.Description += $"\n(Hệ thống: Kế toán đã phân bổ. Phiếu Xuất: {logIS} | Mua Ngoài: {logPO})";
                await _context.SaveChangesAsync();



            // 5. TRẢ VỀ DỮ LIỆU CẢ 2 PHIẾU MỚI CHO FRONTEND
            return Ok(new
            {
                originalIssueId = originalIssue.IssueId,
                status = originalIssue.Status,

                // Trả về Phiếu Xuất Kho Nháp
                newInventorySlipId = newInventorySlip?.IssueId,
                newInventorySlipCode = newInventorySlip?.IssueCode,

                // Trả về Đơn Mua Ngoài Nháp
                newPoSlipId = newDirectPoSlip?.IssueId,
                newPoSlipCode = newDirectPoSlip?.IssueCode
            });
        }


        public class ChangeStatusRequest
        {
            public string Action { get; set; } // Trạng thái muốn chuyển tới
            public string Reason { get; set; } // Ghi chú thêm (nếu có)
            public int? AssignedPickerId { get; set; }

        }

        [HttpPost("{id}/change-status")]
        // [Authorize(Roles = "Accountant, Admin, WarehouseManager")]
        public async Task<IActionResult> ChangeSlipStatus(long id, [FromBody] ChangeStatusRequest request)
        {
           // var slip = await _context.IssueSlips.Include(x => x.Project).FirstOrDefaultAsync(x => x.IssueId == id);
            var slip = await _context.IssueSlips
                                    .Include(x => x.Project)
                                    .Include(x => x.IssueDetails)           
                                        .ThenInclude(d => d.PickingLists)  
                                    .FirstOrDefaultAsync(x => x.IssueId == id);

            if (slip == null) return NotFound("Không tìm thấy phiếu.");

            // Dùng chung 1 API, xử lý linh hoạt dựa vào Action gửi lên
            switch (request.Action)
            {
                case "Pending_Warehouse_Approval":
                    // Kế toán gửi cho Thủ kho
                    if (slip.Status != "Draft_Issue_Note") return BadRequest("Chỉ phiếu Nháp mới được gửi Thủ kho.");
                    slip.Status = "Pending_Warehouse_Approval";
                    break;

                case "Forwarded_To_Purchasing":
                    // Kế toán gửi cho bộ phận Mua hàng
                    if (slip.Status != "Draft_Direct_PO") return BadRequest("Chỉ Đơn mua nháp mới được gửi Thu mua.");
                    // 1. Tạo Đơn mua xuất thẳng mới (Sang bảng DirectPurchaseOrders)
                    var newDpo = new DirectPurchaseOrder
                    {
                        DpoCode = "DPO-" + DateTime.Now.ToString("yyMMdd") + "-" + new Random().Next(1000, 9999),
                        ReferenceCode = slip.IssueCode, // Nối dây rốn với phiếu Nháp
                        ProjectId = slip.Project.ProjectId,
                        CreatedBy = slip.CreatedBy,
                        OrderDate = DateTime.UtcNow,
                        Status = "Pending_Supplier_Selection", // Trạng thái chờ Thu mua vào chọn Nhà cung cấp
                        SupplierId = null, // ĐỂ TRỐNG (Null) chờ Thu mua điền
                        Description = $"Chuyển từ đơn mua nháp {slip.IssueCode}.",
                        DirectPurchaseDetails = new List<DirectPurchaseDetail>()
                    };

                    // 2. Lấy toàn bộ hàng hóa từ Phiếu Nháp copy sang Đơn mua thật
                    foreach (var detail in slip.IssueDetails)
                    {
                        newDpo.DirectPurchaseDetails.Add(new DirectPurchaseDetail
                        {
                            MaterialId = detail.MaterialId,
                            Quantity = detail.Quantity,
                            NegotiatedUnitPrice = detail.UnitPrice ?? 0 // Lấy giá dự toán làm base
                        });
                    }

                    // 3. Add vào database (Entity Framework sẽ tự sinh lệnh INSERT)
                    _context.DirectPurchaseOrders.Add(newDpo);
                    slip.Description += $"\nHệ thống: Đã khởi tạo đơn mua ngoài chính thức [{newDpo.DpoCode}].";
                    slip.Status = "Forwarded_To_Purchasing";
                    break;

                case "Picking_In_Progress":
                    if (!request.AssignedPickerId.HasValue)
                    {
                        return BadRequest("Vui lòng chọn nhân viên kho để phân công nhiệm vụ.");
                    }
                    slip.AssignedPickerId = request.AssignedPickerId.Value;
                    slip.Status = "Picking_In_Progress";
                    slip.Description += $"\n(Kho: Quản lý kho đã phân công phiếu này cho nhân viên ID: {request.AssignedPickerId} lúc {DateTime.Now:HH:mm}).";
                    break;

                case "Ready_For_Delivery":
                    if (slip.Status != "Picking_In_Progress")
                        return BadRequest("Phiếu chưa ở trạng thái đang nhặt hàng.");
                    
                    var refreshToken = Request.Cookies["refreshToken"];
                    if (string.IsNullOrEmpty(refreshToken))
                    {
                        return Unauthorized();
                    }

                    var userFromDb = await _authService.GetUserByRefreshTokenAsync(refreshToken);
                    if (userFromDb == null)
                    {
                        return Unauthorized();
                    }

                    // TIẾN HÀNH TRỪ TỒN KHO VẬT LÝ
                    foreach (var detail in slip.IssueDetails)
                    {
                        foreach (var pick in detail.PickingLists)
                        {
                           
                                pick.IsPicked = true;
                                pick.ActualPickerId = userFromDb.UserId;
                                var inventoryRecord = await _context.InventoryCurrents
                                    .FirstOrDefaultAsync(ic => ic.WarehouseId == slip.WarehouseId
                                                            && ic.MaterialId == detail.MaterialId
                                                            && ic.BatchId == pick.BatchId
                                                            && ic.BinId == pick.BinId);

                                if (inventoryRecord != null)
                                {
                                    // 1. Trừ tồn kho thực tế
                                    inventoryRecord.QuantityOnHand = (inventoryRecord.QuantityOnHand ?? 0) - pick.QtyToPick;

                                    // 2. Giải phóng tồn kho giữ chỗ
                                    inventoryRecord.QuantityAllocated = (inventoryRecord.QuantityAllocated ?? 0) - pick.QtyToPick;
                                    inventoryRecord.LastUpdated = DateTime.Now;
                                    // Đảm bảo không bị âm số (Safe check)
                                    if (inventoryRecord.QuantityAllocated < 0) inventoryRecord.QuantityAllocated = 0;
                                    if (inventoryRecord.QuantityOnHand < 0) inventoryRecord.QuantityOnHand = 0;
                                }
                            
                        }
                    }

                    slip.Status = "Ready_For_Delivery";
                    slip.Description += $"\n(Kho: Đã xuất hàng và trừ tồn kho vật lý lúc {DateTime.Now:HH:mm}).";
                    break;
                case "Completed":
                    // 1. Chỉ cho phép nhận hàng nếu phiếu đang trên đường giao && slip.Status != "Delivering_To_Site"
                    if (slip.Status != "Ready_For_Delivery" )
                        return BadRequest("Phiếu phải ở trạng thái đang giao hàng mới có thể xác nhận.");

                    // 2. Cập nhật trạng thái và ngày thực nhận
                    slip.Status = "Completed";
                    if (slip.Project != null)
                    {
                        // Tính tổng tiền của phiếu xuất này (Số lượng * Đơn giá dự toán/Giá xuất kho)
                        decimal totalSlipCost = slip.IssueDetails.Sum(d => d.Quantity * (d.UnitPrice ?? 0));

                        // Cộng dồn vào chi phí dự án
                        slip.Project.BudgetUsed = (slip.Project.BudgetUsed ?? 0) + totalSlipCost;

                        slip.Description += $"\n(Kế toán: Đã ghi nhận {totalSlipCost:N0} VNĐ từ kho vào chi phí dự án).";
                    }
                    slip.Description += $"\n(Hiện trường: Kỹ sư đã xác nhận nhận đủ hàng vào lúc {DateTime.Now:dd/MM/yyyy HH:mm}).";
                    break;
 

                default:
                    return BadRequest("Trạng thái không hợp lệ.");
            }

            if (!string.IsNullOrEmpty(request.Reason))
            {
                slip.Description += $"\n({DateTime.Now:dd/MM} - {request.Action}: {request.Reason})";
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Chuyển trạng thái thành công!", newStatus = slip.Status });
        }

        public class PickerDto
        {
            public int UserId { get; set; }
            public string? FullName { get; set; }
        }

        [HttpGet("warehouse-staff")]
        public async Task<IActionResult> GetWarehouseStaff()
        {
            var staff = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role.RoleName == "WarehouseStaff" && u.Status == true)
                .Select(u => new PickerDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName
                })
                .ToListAsync();

            return Ok(staff);
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


        [HttpGet("{id}/picking-list")]
        // [Authorize(Roles = "WarehouseStaff, WarehouseManager, Admin")]
        public async Task<IActionResult> GetPickingList(long id)
        {
            // 1. Query lấy Phiếu, Chi tiết, và sâu hơn nữa là PickingList (kèm Batch và Bin)
            var slip = await _context.IssueSlips
                .Include(s => s.IssueDetails)
                    .ThenInclude(d => d.Material) // Lấy tên vật tư
                .Include(s => s.IssueDetails)
                    .ThenInclude(d => d.PickingLists)
                        .ThenInclude(p => p.Batch) // Lấy mã Lô
                .Include(s => s.IssueDetails)
                    .ThenInclude(d => d.PickingLists)
                        .ThenInclude(p => p.Bin) // Lấy mã Kệ
                .FirstOrDefaultAsync(s => s.IssueId == id);

            if (slip == null)
                return NotFound("Không tìm thấy phiếu xuất kho.");

            // 2. Format lại Data (Làm phẳng mảng để UI dễ render thành 1 cái list dài)
            var response = new
            {
                IssueId = slip.IssueId,
                IssueCode = slip.IssueCode,
                Status = slip.Status,
                // AssignedTo = slip.AssignedTo, // Lấy tên nhân viên được giao nếu bạn có làm

                // Làm phẳng danh sách: Lấy tất cả PickingLists từ tất cả IssueDetails
                PickingItems = slip.IssueDetails.SelectMany(d => d.PickingLists.Select(p => new
                {
                    PickingId = p.PickingId,
                    DetailId = d.DetailId,
                    MaterialCode = d.Material.Code,
                    MaterialName = d.Material.Name,
                    Unit = d.Material.Unit,

                    BatchCode = p.Batch.BatchCode,
                    // (Giả sử bảng BinLocation của bạn có cột BinCode hoặc Name)
                    BinLocation = p.Bin != null ? $"{p.Bin.Code} (ID: {p.Bin.BinId})": "N/A",

                    QtyToPick = p.QtyToPick,
                    IsPicked = p.IsPicked
                }))
                .OrderBy(p => p.BinLocation) // TỐI ƯU UX: Xếp theo thứ tự Kệ để nhân viên đi 1 mạch
                .ToList()
            };

            return Ok(response);
        }


    }
}
