using Backend.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.outbound.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShipmentController : ControllerBase
    {
        private readonly MyDbContext _context;

        public ShipmentController(MyDbContext context)
        {
            _context = context;
        }

        [HttpGet("projects/{projectId}/incoming-shipments")]
        // [Authorize(Roles = "SiteEngineer, Admin")]
        public async Task<IActionResult> GetIncomingShipments(int projectId)
        {
            // =========================================================
            // 1. HÚT DỮ LIỆU TỪ KHO (IssueSlips đang trên đường giao)
            // =========================================================
            var warehouseShipments = await _context.IssueSlips
                .Include(s => s.IssueDetails)
                    .ThenInclude(d => d.Material)
                .Where(s => s.ProjectId == projectId && s.Status == "Ready_For_Delivery") // Lấy các phiếu Kho đã xuất
                .Select(s => new IncomingShipmentDto
                {
                    ShipmentId = "IS_" + s.IssueId, // Gắn mác IS
                    SourceType = "Kho nội bộ",
                    ShipmentCode = s.IssueCode,
                    ReferenceCode = s.ReferenceCode,
                    SupplierName = "Kho Tổng Công Ty", // Fake tên cho đẹp UI
                    DispatchDate = s.IssueDate, // Bạn có thể thêm cột ActualDispatchDate ở DB nếu cần
                    Status = "Đang giao đến",
                    Items = s.IssueDetails.Select(d => new IncomingShipmentItemDto
                    {
                        MaterialId = d.MaterialId,
                        MaterialName = d.Material.Name, // Đảm bảo đã Include Material
                        Quantity = d.Quantity
                    }).ToList()
                }).ToListAsync();

            // =========================================================
            // 2. HÚT DỮ LIỆU TỪ MUA NGOÀI (DPO đang trên đường giao)
            // =========================================================
            var supplierShipments = await _context.DirectPurchaseOrders
                .Include(d => d.Supplier)
                .Include(d => d.DirectPurchaseDetails)
                    .ThenInclude(d => d.Material)
                .Where(d => d.ProjectId == projectId && d.Status == "Delivering_To_Site") // Lấy các đơn Thu mua đã chốt
                .Select(d => new IncomingShipmentDto
                {
                    ShipmentId = "DPO_" + d.DpoId, // Gắn mác DPO
                    SourceType = "Nhà cung cấp xuất thẳng",
                    ShipmentCode = d.DpoCode,
                    ReferenceCode = d.ReferenceCode,
                    SupplierName = d.Supplier.Name, // Lấy tên thật của Nhà Cung Cấp
                    DispatchDate = d.ExpectedDeliveryDate,
                    Status = "Đang giao đến",
                    Items = d.DirectPurchaseDetails.Select(detail => new IncomingShipmentItemDto
                    {
                        MaterialId = detail.MaterialId,
                        MaterialName = detail.Material.Name,
                        Quantity = detail.Quantity
                    }).ToList()
                }).ToListAsync();

            // =========================================================
            // 3. TRỘN CHUNG 2 NỒI LẨU & SẮP XẾP THEO THỜI GIAN
            // =========================================================
            var allIncomingShipments = warehouseShipments
                .Concat(supplierShipments)
                .OrderByDescending(x => x.DispatchDate)
                .ToList();

            return Ok(allIncomingShipments);
        }

    }

    public class IncomingShipmentDto
    {
        public string ShipmentId { get; set; } = null!; // Mã trộn (Ví dụ: "IS_12" hoặc "DPO_5")
        public string SourceType { get; set; } = null!; // "Kho nội bộ" hoặc "Nhà cung cấp"
        public string ShipmentCode { get; set; } = null!; // Mã phiếu (IS-... hoặc DPO-...)
        public string ReferenceCode { get; set; } = null!; // Yêu cầu gốc (REQ-...)
        public string? SupplierName { get; set; } // Null nếu xuất từ Kho
        public DateTime? DispatchDate { get; set; } // Ngày xuất phát
        public string Status { get; set; } = "Đang giao đến";

        public List<IncomingShipmentItemDto> Items { get; set; } = new List<IncomingShipmentItemDto>();
    }

    public class IncomingShipmentItemDto
    {
        public int MaterialId { get; set; }
        public string MaterialName { get; set; } = null!;
        // public string Unit { get; set; } = null!; // Nếu Entity Material của bạn có Unit thì mở ra
        public decimal Quantity { get; set; }
    }
}
