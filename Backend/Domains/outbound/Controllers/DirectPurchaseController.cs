using Backend.Data;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DirectPurchaseController : ControllerBase
    {
        private readonly MyDbContext _context;

        public DirectPurchaseController(MyDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDpoDetail(long id)
        {
            var issueCode = await _context.IssueSlips
                                        .Where(x => x.IssueId == id)
                                        .Select(x => x.IssueCode)
                                        .FirstOrDefaultAsync();
            if (string.IsNullOrEmpty(issueCode))
                return NotFound(new { message = "Không tìm thấy phiếu yêu cầu gốc." });
            // && x.SupplierId != null
            var dpo = await _context.DirectPurchaseOrders
                .Include(d => d.DirectPurchaseDetails)
                    .ThenInclude(detail => detail.Material )
                .Where(x => x.ReferenceCode == issueCode )
                .Select(x => new DirectPurchaseOrderDto
                {
                    DpoId = x.DpoId,
                    DpoCode = x.DpoCode,
                    ReferenceCode = x.ReferenceCode,
                    SupplierId = x.SupplierId,
                    ProjectId = x.ProjectId,
                    Status = x.Status,
                    TotalAmount = x.TotalAmount,

                    Details = x.DirectPurchaseDetails.Select(d => new DirectPurchaseDetailDto
                    {
                        DpoDetailId = d.DpoDetailId,
                        MaterialId = d.MaterialId,
                        MaterialName = d.Material.Name, // ⚠️ cần navigation
                        Quantity = d.Quantity,
                        NegotiatedUnitPrice = d.NegotiatedUnitPrice,
                        LineTotal = d.LineTotal
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (dpo == null)
                return NotFound();

            return Ok(dpo);
        }

        [HttpPost("{id}/confirm-order")]
        // [Authorize(Roles = "Purchasing, Admin")]
        public async Task<IActionResult> ConfirmPurchaseOrder(long id, [FromBody] ConfirmDpoRequest request)
        {
            // 1. Kiểm tra Validate
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 2. Lấy phiếu DPO NHÁP kèm theo các dòng chi tiết
            var originalDpo = await _context.DirectPurchaseOrders
                .Include(x => x.DirectPurchaseDetails)
                .FirstOrDefaultAsync(x => x.DpoId == id);

            if (originalDpo == null)
                return NotFound(new { message = "Không tìm thấy đơn mua xuất thẳng." });

            // 3. Chặn nếu phiếu không nằm ở trạng thái nháp
            if (originalDpo.Status != "Pending_Supplier_Selection" && originalDpo.Status != "Draft_DPO" && originalDpo.Status != "Forwarded_To_Purchasing")
            {
                return BadRequest(new { message = "Phiếu này không ở trạng thái chờ Thu mua chốt đơn." });
            }

            // 4. GOM NHÓM VẬT TƯ THEO NHÀ CUNG CẤP (Phép thuật nằm ở đây)
            var groupedItems = request.Items.GroupBy(i => i.SupplierId).ToList();

            var newlyCreatedDpoCodes = new List<string>(); // Để ghi log

            // 5. DUYỆT QUA TỪNG NHÀ CUNG CẤP ĐỂ ĐẺ RA PHIẾU MỚI
            foreach (var group in groupedItems)
            {
                var supplierId = group.Key;
                decimal totalOrderAmount = 0;

                // Tạo 1 Phiếu DPO THỰC TẾ cho Nhà cung cấp này
                var newDpo = new DirectPurchaseOrder
                {
                    DpoCode = "DPO-" + DateTime.Now.ToString("yyMMdd") + "-" + new Random().Next(1000, 9999),
                    ReferenceCode = originalDpo.ReferenceCode, // Vẫn nối về mã Yêu cầu gốc (REQ-...)
                    ProjectId = originalDpo.ProjectId,
                    CreatedBy = originalDpo.CreatedBy,

                    SupplierId = supplierId, // Lấy ID nhà cung cấp từ nhóm

                    OrderDate = DateTime.UtcNow,
                    ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                    DeliveryAddress = request.DeliveryAddress,

                    Status = "Ready_For_Delivery", // Chuyển thẳng sang trạng thái Đang giao hàng
                    Description = $"Đơn hàng tách từ phiếu yêu cầu {originalDpo.DpoCode}.",
                    DirectPurchaseDetails = new List<DirectPurchaseDetail>()
                };

                // Lọc và copy các vật tư thuộc về Nhà cung cấp này
                foreach (var reqItem in group)
                {
                    var oldDetail = originalDpo.DirectPurchaseDetails.FirstOrDefault(d => d.DpoDetailId == reqItem.DpoDetailId);
                    if (oldDetail != null)
                    {
                        // Bỏ vào phiếu mới
                        newDpo.DirectPurchaseDetails.Add(new DirectPurchaseDetail
                        {
                            MaterialId = oldDetail.MaterialId,
                            Quantity = oldDetail.Quantity,
                            NegotiatedUnitPrice = reqItem.NegotiatedUnitPrice,
                            SupplierId = supplierId
                        });

                        // Cộng dồn tiền
                        totalOrderAmount += (oldDetail.Quantity * reqItem.NegotiatedUnitPrice);
                    }
                }

                newDpo.TotalAmount = totalOrderAmount;

                // Thêm phiếu mới vào DB
                _context.DirectPurchaseOrders.Add(newDpo);
                newlyCreatedDpoCodes.Add(newDpo.DpoCode);
            }

            // 6. KHÓA PHIẾU NHÁP LẠI (Chuyển trạng thái để không hiện lên danh sách chờ xử lý nữa)
            originalDpo.Status = "Processed";
            string codes = string.Join(", ", newlyCreatedDpoCodes);
            originalDpo.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Thu mua đã tách thành {groupedItems.Count} đơn hàng thực tế: {codes})";
            var parentIssueSlip = await _context.IssueSlips
                                            .FirstOrDefaultAsync(s => s.IssueCode == originalDpo.ReferenceCode);

            if (parentIssueSlip != null)
            {
                // Đổi trạng thái để Tracking của Đội thi công nhảy sang bước tiếp theo
                parentIssueSlip.Status = "Processed";

                parentIssueSlip.Description += $"\n({DateTime.Now:dd/MM HH:mm} - Hệ thống: Thu mua đã chốt đơn. Các mã đơn thực tế: {codes}. Hàng đang được giao đến công trường).";
            }
            // 7. Lưu tất cả sự thay đổi xuống DB
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Đã chốt đơn và tự động tách thành {groupedItems.Count} phiếu giao hàng!",
                newStatus = originalDpo.Status
            });
        }

        [HttpGet("api/site/incoming-shipments")]
        // [Authorize(Roles = "SiteEngineer, Admin")]
        public async Task<IActionResult> GetIncomingShipments()
        {
            string deliveringStatus = "Ready_For_Delivery";

            // 1. LẤY CÁC CHUYẾN XE TỪ KHO NỘI BỘ (Không đổi)
            var issueSlipsData = await _context.IssueSlips
                .Include(i => i.IssueDetails)
                    .ThenInclude(d => d.Material)
                .Where(i => i.Status == deliveringStatus)
                .ToListAsync(); // Kéo về RAM trước

            var issueSlips = issueSlipsData.Select(i => new IncomingShipmentDto
            {
                RecordId = i.IssueId,
                Code = i.IssueCode,
                Type = "Issue_Slip",
                SourceName = "Kho Công Ty",
                ExpectedDate = i.IssueDate,
                Status = "Đang giao đến",
                ItemsSummary = string.Join(", ", i.IssueDetails.Select(d => $"{d.Quantity} {d.Material.Name}")),
                LicensePlate = i.Description
            }).ToList();

            // 2. LẤY CÁC CHUYẾN XE TỪ NHÀ CUNG CẤP (Sửa lại bằng LINQ JOIN)
            // Dùng cú pháp Query Syntax để thực hiện Left Join với bảng Suppliers
            var dposQuery = await (
                from d in _context.DirectPurchaseOrders
                    .Include(x => x.DirectPurchaseDetails)
                        .ThenInclude(x => x.Material)
                where d.Status == deliveringStatus
                join s in _context.Suppliers on d.SupplierId equals s.SupplierId into supGroup
                from s in supGroup.DefaultIfEmpty() // Left join đề phòng SupplierId null
                select new
                {
                    Dpo = d,
                    SupplierName = s != null ? s.Name : "Không rõ NCC"
                }
            ).ToListAsync(); // Kéo về RAM

            var dpos = dposQuery.Select(x => new IncomingShipmentDto
            {
                RecordId = x.Dpo.DpoId,
                Code = x.Dpo.DpoCode,
                Type = "Direct_PO",
                SourceName = x.SupplierName, // Lấy tên NCC từ phép Join ở trên
                ExpectedDate = x.Dpo.ExpectedDeliveryDate,
                Status = "Đang giao đến",
                ItemsSummary = string.Join(", ", x.Dpo.DirectPurchaseDetails.Select(detail => $"{detail.Quantity} {detail.Material.Name}")),
                LicensePlate = x.Dpo.DeliveryAddress
            }).ToList();

            // 3. HỢP NHẤT (MERGE) & SẮP XẾP
            var allShipments = new List<IncomingShipmentDto>();
            allShipments.AddRange(issueSlips);
            allShipments.AddRange(dpos);

            var sortedShipments = allShipments
                .OrderBy(s => s.ExpectedDate ?? DateTime.MaxValue)
                .ToList();

            return Ok(sortedShipments);
        }

        [HttpPost("{id}/confirm-receipt")]
        public async Task<IActionResult> ConfirmReceipt(long id)
        {
            // 1. Lấy thông tin đơn mua kèm theo thông tin Dự án để cập nhật tiền
            var dpo = await _context.DirectPurchaseOrders
                                    .Include(x => x.Project)
                                    .FirstOrDefaultAsync(x => x.DpoId == id);

            if (dpo == null) return NotFound("Không tìm thấy đơn mua hàng.");

            // 2. Kiểm tra trạng thái Ready_For_Delivery
            if (dpo.Status != "Ready_For_Delivery")
                return BadRequest("Đơn hàng chưa ở trạng thái giao hàng hoặc đã hoàn thành trước đó.");

            // 3. Cập nhật trạng thái đơn hàng
            dpo.Status = "Completed";
            dpo.ActualDeliveryDate = DateTime.UtcNow;
            dpo.Description += $"\n(Hiện trường: Đã xác nhận nhận hàng thành công. Ghi nhận công nợ cho NCC).";

            // 4. 🔥 LOGIC "ĂN TIỀN" CỦA MATCOST: Cập nhật chi phí thực tế cho Dự án
            // Giả sử bảng Project của bạn có cột BudgetUsed (Số tiền đã tiêu thực tế)
            if (dpo.Project != null)
            {
                dpo.Project.BudgetUsed = (dpo.Project.BudgetUsed ?? 0) + dpo.TotalAmount;

                dpo.Description += $"\n(Kế toán: Đã ghi nhận {dpo.TotalAmount:N0} VNĐ vào chi phí dự án).";
            }

            var siblingDpos = await _context.DirectPurchaseOrders
                                            .Where(p => p.ReferenceCode == dpo.ReferenceCode
                                                     && p.SupplierId != null
                                                     && p.DpoId != dpo.DpoId) // Loại trừ chính nó vì mình vừa set Completed ở trên
                                            .ToListAsync();
            bool areAllSiblingsCompleted = siblingDpos.All(p => p.Status == "Completed");


            if (areAllSiblingsCompleted)
            {
                // 5.1. Tự động ĐÓNG PHIẾU NHÁP (DPO ID 12 - SupplierId là null)
                var draftDpo = await _context.DirectPurchaseOrders
                    .FirstOrDefaultAsync(p => p.ReferenceCode == dpo.ReferenceCode && p.SupplierId == null);

                if (draftDpo != null && draftDpo.Status != "Completed")
                {
                    draftDpo.Status = "Completed";
                    draftDpo.Description += $"\n(Hệ thống: Toàn bộ đơn hàng thuộc nhóm này đã giao xong. Hoàn tất phiếu nháp).";
                }

                // 5.2. Tự động ĐÓNG PHIẾU GỐC BÊN KỸ SƯ (Bảng IssueSlips)
                var parentIssueSlip = await _context.IssueSlips
                    .FirstOrDefaultAsync(s => s.IssueCode == dpo.ReferenceCode);

                if (parentIssueSlip != null && parentIssueSlip.Status != "Completed")
                {
                    parentIssueSlip.Status = "Completed";
                    parentIssueSlip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Toàn bộ hàng Mua ngoài đã được giao đủ đến công trình. Hoàn tất yêu cầu).";
                    
                    string rootReqCode = parentIssueSlip.ReferenceCode; 

                    if (!string.IsNullOrEmpty(rootReqCode))
                    {
                        // Tìm tất cả các phiếu anh em ở tầng 2 (Ví dụ: thằng IS-260420-6036)
                        // Phải loại trừ cái thằng issueSlipPo hiện tại ra vì nó đang nằm trên RAM, chưa lưu DB
                        var siblingIssueSlips = await _context.IssueSlips
                            .Where(s => s.ReferenceCode == rootReqCode && s.IssueId != parentIssueSlip.IssueId)
                            .ToListAsync();

                        // Nếu tất cả các nhánh khác (kho nội bộ) cũng đã Completed hết rồi
                        if (siblingIssueSlips.All(s => s.Status == "Completed"))
                        {
                            // Lôi cổ thằng Ông nội (REQ gốc - ID 72) ra đóng luôn!
                            var rootSlip = await _context.IssueSlips
                                .FirstOrDefaultAsync(s => s.IssueCode == rootReqCode);

                            if (rootSlip != null && rootSlip.Status != "Completed")
                            {
                                rootSlip.Status = "Completed";
                                rootSlip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Toàn bộ hàng từ Kho và Mua ngoài đều đã đáp ứng đủ. Hoàn tất yêu cầu cấp phát).";
                            }
                        }
                    }

                }
            }

            // 5. Lưu thay đổi
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xác nhận nhận hàng thành công! Chi phí đã được ghi nhận cho dự án.",
                dpoCode = dpo.DpoCode,
            });
        }
    }


    public class IncomingShipmentDto
    {
        public long RecordId { get; set; }
        public string Code { get; set; }
        public string Type { get; set; }
        public string SourceName { get; set; }
        public DateTime? ExpectedDate { get; set; }
        public string Status { get; set; } 
        public string ItemsSummary { get; set; }
        public string LicensePlate { get; set; }
    }

    public class DirectPurchaseDetailDto
    {
        public long DpoDetailId { get; set; }
        public int MaterialId { get; set; }
        public string MaterialName { get; set; } = null!;
        public decimal Quantity { get; set; }
        public decimal NegotiatedUnitPrice { get; set; }
        public decimal? LineTotal { get; set; }
    }

    public class DirectPurchaseOrderDto
    {
        public long DpoId { get; set; }
        public string DpoCode { get; set; } = null!;
        public string ReferenceCode { get; set; } = null!;
        public int? SupplierId { get; set; }
        public int ProjectId { get; set; }
        public string Status { get; set; } = null!;
        public decimal TotalAmount { get; set; }

        public List<DirectPurchaseDetailDto> Details { get; set; } = new();
    }
    public class ConfirmDpoRequest
    {
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? DeliveryAddress { get; set; }
        public List<UpdateDpoPriceDto> Items { get; set; } = new List<UpdateDpoPriceDto>();
    }

    public class UpdateDpoPriceDto
    {
        public long DpoDetailId { get; set; }
        public decimal NegotiatedUnitPrice { get; set; }
        public int SupplierId { get; set; } // <--- Nhận thêm cái này từ UI
    }
   
   
}
