using Backend.Data;
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

            var dpo = await _context.DirectPurchaseOrders
                .Where(x => x.ReferenceCode == issueCode)
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
            // 1. Kiểm tra Validate từ DTO
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 2. Lấy phiếu DPO kèm theo các dòng chi tiết
            var dpo = await _context.DirectPurchaseOrders
                .Include(x => x.DirectPurchaseDetails)
                .FirstOrDefaultAsync(x => x.DpoId == id);

            if (dpo == null)
                return NotFound(new { message = "Không tìm thấy đơn mua xuất thẳng." });

            // 3. Chặn nếu phiếu không nằm ở trạng thái chờ Thu mua xử lý
            if (dpo.Status != "Pending_Supplier_Selection" && dpo.Status != "Forwarded_To_Purchasing")
            {
                return BadRequest(new { message = "Phiếu này không ở trạng thái chờ Thu mua chốt đơn." });
            }

            // 4. Cập nhật thông tin Master (Đầu phiếu)
            dpo.SupplierId = request.SupplierId;
            dpo.ExpectedDeliveryDate = request.ExpectedDeliveryDate;

            if (!string.IsNullOrEmpty(request.DeliveryAddress))
            {
                dpo.DeliveryAddress = request.DeliveryAddress;
            }

            // 5. Cập nhật Giá đàm phán cho từng dòng chi tiết & Tính lại Tổng tiền
            decimal totalOrderAmount = 0;

            foreach (var reqItem in request.Items)
            {
                var detail = dpo.DirectPurchaseDetails.FirstOrDefault(d => d.DpoDetailId == reqItem.DpoDetailId);
                if (detail != null)
                {
                    // Cập nhật giá mới do Thu mua nhập vào
                    detail.NegotiatedUnitPrice = reqItem.NegotiatedUnitPrice;

                    // Tính thành tiền của dòng này và cộng dồn vào tổng
                    totalOrderAmount += (detail.Quantity * detail.NegotiatedUnitPrice);
                }
            }

            // 6. Cập nhật Tổng tiền và Trạng thái
            dpo.TotalAmount = totalOrderAmount;
            dpo.Status = "Delivering_To_Site"; // Trạng thái: Đang giao đến công trường

            // Ghi log lại lịch sử thao tác
            dpo.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Thu mua chốt đơn. Tổng tiền: {totalOrderAmount:N0} VNĐ)";

            // 7. Lưu DB
            await _context.SaveChangesAsync();

            // 8. Trả về cho Frontend
            return Ok(new
            {
                message = "Đã chốt đơn và chuyển trạng thái Đang giao hàng!",
                dpoId = dpo.DpoId,
                totalAmount = dpo.TotalAmount,
                newStatus = dpo.Status
            });
        }
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
        [Required(ErrorMessage = "Vui lòng chọn Nhà cung cấp.")]
        public int SupplierId { get; set; }

        public DateTime? ExpectedDeliveryDate { get; set; }

        public string? DeliveryAddress { get; set; }

        [Required(ErrorMessage = "Danh sách vật tư không được để trống.")]
        [MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 vật tư.")]
        public List<UpdateDpoPriceDto> Items { get; set; } = new List<UpdateDpoPriceDto>();
    }

    public class UpdateDpoPriceDto
    {
        [Required]
        public long DpoDetailId { get; set; }

        [Required]
        public decimal NegotiatedUnitPrice { get; set; }
    }
}
