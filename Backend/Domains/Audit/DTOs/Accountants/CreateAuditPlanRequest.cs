using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class CreateAuditPlanRequest
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = default!;

        [Required]
        public int WarehouseId { get; set; }

        /// <summary>
        /// Danh sách BinLocationIds cần kiểm kê.
        /// Nếu rỗng hoặc null, kiểm kê toàn bộ kho.
        /// Nếu có giá trị, chỉ kiểm kê các bin trong danh sách.
        /// </summary>
        public List<int>? BinLocationIds { get; set; }

        [Required]
        public DateTime PlannedStartDate { get; set; }

        [Required]
        public DateTime PlannedEndDate { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }
}
