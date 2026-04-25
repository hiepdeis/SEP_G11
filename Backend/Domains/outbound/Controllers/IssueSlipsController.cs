using Backend.Data;
using Backend.Domains.auth.Interfaces;
using Backend.Domains.auth.Services;
using Backend.Domains.outbound.Dtos;
using Backend.Domains.outbound.Interface;
using Backend.Domains.outbound.Services;
using Backend.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
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
        private readonly IssueService _issueService;
        private readonly IssueDetailsService _issueDetailsService;
        private readonly IIssueSlipWorkflowService _workflowService;
        public IssueSlipsController(MyDbContext context, IAuthService auth, IssueService issue, IssueDetailsService issueDetails, IIssueSlipWorkflowService workflowService)
        {
            _context = context;
            _authService = auth;
            _issueService = issue;
            _issueDetailsService = issueDetails;
            _workflowService = workflowService;
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

            var (success, message, data) = await _issueService.CreateIssueSlipAsync(dto);

            if (!success)
            {
                if (message.Contains("Invalid data"))
                    return BadRequest(message);

                if (message.Contains("stock take"))
                    return StatusCode(StatusCodes.Status409Conflict, message);

                if (message.Contains("not found"))
                    return NotFound(message);

                return BadRequest(message);
            }

            return Ok(data);
        }

        [HttpPost("{issueId}/details")]
        public async Task<IActionResult> AddIssueDetails(long issueId, List<CreateIssueDetailDto> details)
        {
            var (success, message, data) = await _issueDetailsService.AddIssueDetailsAsync(issueId, details);

            if (!success)
            {
                if (message.Contains("not found"))
                    return NotFound(message);

                return BadRequest(message);
            }

            return Ok(data);

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

            // 5. LẤY DANH SÁCH PHIẾU CON (Dạng List linh hoạt)
            object trackingSlipList = null;
            if (issue.Status == "Processed" && childSlips.Any())
            {
                // Dùng luôn cái childSlips đã query ở trên cho đỡ tốn 1 vòng vào DB
                trackingSlipList = childSlips.Select(s => new
                {
                    SlipId = s.IssueId,
                    SlipCode = s.IssueCode,
                    Status = s.Status,
                    SlipType = s.IssueCode.StartsWith("IS-") ? "Phiếu xuất kho" :
                               s.IssueCode.StartsWith("PO-") ? "Đơn mua ngoài" : "Phiếu liên quan"
                }).ToList();
            }

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

               
                GeneratedSlips = generatedSlips,
                TrackingSlips = trackingSlipList,
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
            try
            {
                switch (request.Action)
                {
                    case "Pending_Warehouse_Approval":
                        // Kế toán gửi cho Thủ kho
                        var (success, message) = await _workflowService.ForwardToWarehouseAsync(id, request.Reason);
                        if (success!= true) return BadRequest(new { message });
                        break;

                    case "Forwarded_To_Purchasing":
                        // Kế toán gửi cho bộ phận Mua hàng
                        var currentToken = Request.Cookies["refreshToken"];
                        var currentUser = await _authService.GetUserByRefreshTokenAsync(currentToken);
                        if (currentUser == null) return Unauthorized(new { message = "Phiên đăng nhập hết hạn." });

                        var result = await _workflowService.ForwardToPurchasingAsync(id, currentUser.UserId, request.Reason);
                        if (!result.Success)
                            return BadRequest(new { message = result.Message });
                        break;

                    case "Picking_In_Progress":
                        // thủ kho gán nhân viên 
                        if (!request.AssignedPickerId.HasValue)
                            return BadRequest(new { message = "Vui lòng chọn nhân viên kho để phân công nhiệm vụ." });

                        var result1 =  await _workflowService.StartPickingAsync(id, request.AssignedPickerId.Value, request.Reason);
                        if (!result1.Success)
                            return BadRequest(new { message = result1.Message });
                        break;
                    case "Ready_For_Delivery":
                        // nhân viên bốc hàng 
                        var refreshToken = Request.Cookies["refreshToken"];
                        if (string.IsNullOrEmpty(refreshToken)) return Unauthorized(new { message = "Vui lòng đăng nhập." });

                        var userFromDb = await _authService.GetUserByRefreshTokenAsync(refreshToken);
                        if (userFromDb == null) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

                        var result3 =  await _workflowService.FinishPickingAndDeductInventoryAsync(id, userFromDb.UserId, request.Reason);
                        if (!result3.Success)
                            return BadRequest(new { message = result3.Message });
                        break;
                    case "Completed":
                        // kĩ sư hiện trường chấp nhận hàng 
                        var result4 =  await _workflowService.CompleteReceiptAsync(id, request.Reason);
                        if (!result4.Success) 
                            return BadRequest(new { message = result4.Message });
                        break;
                    case "Closed":
                        // kế toán hạch toán 
                        var result5 =  await _workflowService.CloseSlipAsync(id, request.Reason);
                        if (!result5.Success)
                            return BadRequest(new { message = result5.Message });
                        break;

                    default:
                        return BadRequest("Trạng thái không hợp lệ.");
                }
                return Ok(new { message = "Chuyển trạng thái thành công!", newStatus = request.Action });
            }
            catch (KeyNotFoundException ex)
            {
                // Bắt lỗi không tìm thấy phiếu từ Service
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // Bắt các lỗi sai luồng nghiệp vụ (Ví dụ: phiếu chưa duyệt mà đòi xuất kho)
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Bắt các lỗi hệ thống văng ra (như lỗi Database, lỗi Transaction)
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống trong quá trình xử lý.", details = ex.Message });
            }
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

        [HttpGet("{id}/accounting-reconciliation")]
        [Authorize(Roles = "Accountant, Admin")]
        public async Task<IActionResult> GetAccountingReconciliation(long id)
        {
            var currentSlip = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.IssueDetails).ThenInclude(d => d.Material)
                .FirstOrDefaultAsync(x => x.IssueId == id);

            if (currentSlip == null) return NotFound("Không tìm thấy phiếu gốc.");

            var result = new AccountingReconciliationDto
            {
                ParentIssueId = currentSlip.IssueId,
                ParentIssueCode = currentSlip.IssueCode,
                ProjectName = currentSlip.Project.Name,
                ProjectBudgetTotal = currentSlip.Project.Budget ?? 0,
                ProjectBudgetUsedBefore = currentSlip.Project.BudgetUsed ?? 0
            };

            var directPOs = await _context.DirectPurchaseOrders
                            .Include(p => p.DirectPurchaseDetails).ThenInclude(d => d.Material)
                            .Include(p => p.DirectPurchaseDetails).ThenInclude(d => d.Supplier)
                            .Where(p => p.ReferenceCode == currentSlip.IssueCode && p.SupplierId != null)
                            .ToListAsync();

            if (directPOs.Any())
            {
                // -----------------------------------------------------------------
                // TRƯỜNG HỢP 1: LÀ PHIẾU MUA NGOÀI (CÓ DPO THỰC TẾ TRONG BẢNG)
                // -----------------------------------------------------------------
                foreach (var dpo in directPOs)
                {
                    var dpoDto = new ChildSlipAccountingDto
                    {
                        SlipId = dpo.DpoId,
                        SlipCode = dpo.DpoCode,
                        SlipType = "Direct_PO",
                        Status = dpo.Status,
                        ActualTotal = dpo.TotalAmount,
                        Details = dpo.DirectPurchaseDetails.Select(d => new AccountingDetailItemDto
                        {
                            MaterialName = d.Material.Name,
                            Unit = d.Material.Unit,
                            RequestedQty = d.Quantity,
                            FinalUnitPrice = d.NegotiatedUnitPrice, 
                            LineTotal = d.LineTotal ?? (d.Quantity * d.NegotiatedUnitPrice),
                            SupplierName = d.Supplier?.Name ?? "Chưa gán NCC"
                        }).ToList()
                    };

                    // Gom nhóm công nợ trả NCC
                    dpoDto.Liabilities = dpo.DirectPurchaseDetails
                        .GroupBy(d => new { d.SupplierId, SupplierName = d.Supplier?.Name })
                        .Select(g => new SupplierLiabilityDto
                        {
                            SupplierId = g.Key.SupplierId,
                            SupplierName = g.Key.SupplierName ?? "Chưa gán NCC",
                            Amount = g.Sum(d => d.LineTotal ?? (d.Quantity * d.NegotiatedUnitPrice))
                        }).ToList();

                    result.ChildSlips.Add(dpoDto);
                }
            }
            else
            {
                // -----------------------------------------------------------------
                // TRƯỜNG HỢP 2: LÀ PHIẾU KHO NỘI BỘ (KHÔNG CÓ DPO NÀO)
                // -----------------------------------------------------------------
                result.ChildSlips.Add(new ChildSlipAccountingDto
                {
                    SlipId = currentSlip.IssueId, 
                    SlipCode = currentSlip.IssueCode,
                    SlipType = "Internal_IS",
                    Status = currentSlip.Status,               
                    ActualTotal = currentSlip.IssueDetails.Sum(d => d.Quantity * (d.Material?.UnitPrice ?? 0)),
                    Details = currentSlip.IssueDetails.Select(d => new AccountingDetailItemDto
                    {
                        MaterialName = d.Material.Name,
                        Unit = d.Material.Unit,
                        RequestedQty = d.Quantity, 
                        FinalUnitPrice = d.Material?.UnitPrice ?? 0,
                        LineTotal = d.Quantity * (d.Material?.UnitPrice ?? 0),
                        SupplierName = "Kho Nội Bộ"
                    }).ToList()
                });
            }

            // 3. Tính tổng tiền chi phí thực tế của toàn bộ luồng
            result.TotalFinalCost = result.ChildSlips.Sum(s => s.ActualTotal);

            return Ok(result);
        }

        [HttpPost("{id}/finalize-accounting")]
        [Authorize(Roles = "Accountant, Admin")]
        public async Task<IActionResult> FinalizeAccounting(long id, [FromBody] CloseIssueSlipRequest request)
        {
            string referenceCode = "";
            string slipCode = "";
            decimal originalAmount = 0; 
            int? projectId = null;

            // ==========================================================
            // 1. CẬP NHẬT TRẠNG THÁI & CHỨNG TỪ THEO LOẠI PHIẾU
            // ==========================================================
            if (request.SlipType == "Internal_IS")
            {
                var slip = await _context.IssueSlips
                    .Include(s => s.Project)
                    .Include(s => s.IssueDetails).ThenInclude(d => d.Material)
                    .FirstOrDefaultAsync(s => s.IssueId == id);

                if (slip == null) return NotFound("Không tìm thấy phiếu xuất kho.");
                if (slip.Status != "Completed") return BadRequest("Phiếu phải ở trạng thái Completed mới được hạch toán.");

                slip.Status = "Closed";
                slip.VoucherNo = request.VoucherNo;
                slip.Description += $"\n[CHỐT SỔ] Số CT: {request.VoucherNo} | Ngày HT: {request.AccountingDate:dd/MM/yyyy}";
                if (!string.IsNullOrEmpty(request.Note)) slip.Description += $" | Ghi chú: {request.Note}";

                // Lấy thông tin cho bước sau
                referenceCode = slip.ReferenceCode;
                slipCode = slip.IssueCode;
                projectId = slip.ProjectId;
                // Tính lại số tiền đã ghi nhận lúc xuất kho (lấp liếm bằng Material.UnitPrice)
                originalAmount = slip.IssueDetails.Sum(d => d.Quantity * (d.Material?.UnitPrice ?? 0));
            }
            else if (request.SlipType == "Direct_PO")
            {
                var poSlip = await _context.IssueSlips
                        .Include(p => p.Project)
                        .FirstOrDefaultAsync(p => p.IssueId == id);

                if (poSlip == null) return NotFound("Không tìm thấy Phiếu yêu cầu mua ngoài.");
                if (poSlip.Status != "Completed") return BadRequest("Luồng mua ngoài chưa hoàn thành, không thể hạch toán.");

                // 2. LẤY TẤT CẢ DPO TỪ BẢNG DIRECT_PURCHASE_ORDERS (Tầng 3)
                var allDpos = await _context.DirectPurchaseOrders
                    .Where(p => p.ReferenceCode == poSlip.IssueCode)
                    .ToListAsync();


                var draftDpo = allDpos.FirstOrDefault(p => p.SupplierId == null);
                var actualDpos = allDpos.Where(p => p.SupplierId != null).ToList();

                // A. Chốt sổ Phiếu PO Tầng 2
                poSlip.Status = "Closed";
                poSlip.VoucherNo = request.VoucherNo;
                poSlip.Description += $"\n[CHỐT SỔ] Số CT: {request.VoucherNo} | Ngày HT: {request.AccountingDate:dd/MM/yyyy}";
                if (!string.IsNullOrEmpty(request.Note)) poSlip.Description += $" | Ghi chú: {request.Note}";

                // B. Chốt sổ đám DPO thực tế Tầng 3
                foreach (var dpo in actualDpos)
                {
                    if (dpo.Status != "Closed")
                    {
                        dpo.Status = "Closed";
                        dpo.Description += $"\n[CHỐT SỔ] Số CT: {request.VoucherNo} | Ngày HT: {request.AccountingDate:dd/MM/yyyy}";
                    }
                }

                // C. Đóng nốt thằng DPO Nháp Tầng 3 
                if (draftDpo != null && draftDpo.Status != "Closed")
                {
                    draftDpo.Status = "Closed";
                    draftDpo.Description += $"\n(Hệ thống: Kế toán đã chốt sổ luồng mua ngoài này).";
                }

                // 4. CHUẨN BỊ DATA CHO BƯỚC CHECK CHÉO ĐÓNG PHIẾU GỐC REQ (TẦNG 1)
                referenceCode = poSlip.ReferenceCode;
                slipCode = poSlip.IssueCode;
                projectId = poSlip.ProjectId;
            
                originalAmount = actualDpos.Sum(p => p.TotalAmount);
            }
            else
            {
                return BadRequest("Loại phiếu (SlipType) không hợp lệ.");
            }

            // ==========================================================
            // 2. ĐIỀU CHỈNH TIỀN DỰ ÁN (NẾU KẾ TOÁN GÕ LẠI SỐ TIỀN)
            // ==========================================================
            if (request.FinalTotalAmount.HasValue && projectId.HasValue)
            {
                decimal adjustment = request.FinalTotalAmount.Value - originalAmount;

                if (adjustment != 0)
                {
                    var project = await _context.Projects.FindAsync(projectId);
                    if (project != null)
                    {
                        project.BudgetUsed = (project.BudgetUsed ?? 0) + adjustment;
                    }
                }
            }

            // ==========================================================
            // 3. LOGIC TỰ ĐỘNG ĐÓNG PHIẾU GỐC (CHECK CHÉO)
            // ==========================================================
            if (!string.IsNullOrEmpty(referenceCode))
            {
                // Lấy tất cả phiếu con cùng 1 mẹ (ReferenceCode)
                var internalSlips = await _context.IssueSlips
                    .Where(s => s.ReferenceCode == referenceCode && s.IssueCode.StartsWith("IS-"))
                    .ToListAsync();

                var dpoSlips = await _context.DirectPurchaseOrders
                    .Where(p => p.ReferenceCode == referenceCode && p.SupplierId != null)
                    .ToListAsync();

                // Kiểm tra xem tất cả các phiếu con có status là "Closed" hết chưa
                bool isAllIsClosed = internalSlips.All(s => s.Status == "Closed");
                bool isAllDpoClosed = dpoSlips.All(p => p.Status == "Closed");

                if (isAllIsClosed && isAllDpoClosed)
                {
                    var rootReq = await _context.IssueSlips.FirstOrDefaultAsync(s => s.IssueCode == referenceCode);
                    if (rootReq != null && rootReq.Status != "Closed")
                    {
                        rootReq.Status = "Closed";
                        rootReq.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Kế toán đã hạch toán chốt sổ TOÀN BỘ các phiếu con. Đóng luồng REQ).";
                    }
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "Hạch toán thành công và đã đóng phiếu.", slipCode = slipCode });
        }
    }
    public class CloseIssueSlipRequest
    {
        public string SlipType { get; set; }
        public string VoucherNo { get; set; } = null!; // Số chứng từ kế toán
        public DateTime AccountingDate { get; set; } // Ngày vào sổ hạch toán
        public string? Note { get; set; } // Ghi chú thêm của kế toán

        public decimal? FinalTotalAmount { get; set; }
    }

    public class AccountingReconciliationDto
    {
        public long ParentIssueId { get; set; }
        public string ParentIssueCode { get; set; }
        public string ProjectName { get; set; }
        public decimal ProjectBudgetTotal { get; set; }
        public decimal ProjectBudgetUsedBefore { get; set; }
        public decimal TotalFinalCost { get; set; }
        public decimal ProjectBudgetUsedAfter => ProjectBudgetUsedBefore + TotalFinalCost;
        public List<ChildSlipAccountingDto> ChildSlips { get; set; } = new();
    }

    public class ChildSlipAccountingDto
    {
        public long SlipId { get; set; }
        public string SlipCode { get; set; }
        public string SlipType { get; set; } 
        public string Status { get; set; }
        public decimal ActualTotal { get; set; }

        // [MỚI] Danh sách công nợ được nhóm theo Nhà cung cấp
        public List<SupplierLiabilityDto> Liabilities { get; set; } = new();
        public List<AccountingDetailItemDto> Details { get; set; } = new();
    }

    // [MỚI] Class gom nhóm công nợ
    public class SupplierLiabilityDto
    {
        public int? SupplierId { get; set; }
        public string SupplierName { get; set; }
        public decimal Amount { get; set; }
    }

    public class AccountingDetailItemDto
    {
        public string MaterialName { get; set; }
        public string Unit { get; set; }
        public decimal RequestedQty { get; set; }
        public decimal FinalUnitPrice { get; set; }
        public decimal LineTotal { get; set; }

        // [MỚI] Tên NCC cung cấp riêng món vật tư này
        public string SupplierName { get; set; }
    }
}
