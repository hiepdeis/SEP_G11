using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class UpdateAuditPlanRequest
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = default!;

        [Required]
        public int WarehouseId { get; set; }

        /// <summary>
        /// Danh sách BinLocationIds cần kiểm kê.
        /// Nếu rỗng hoặc null, kiểm kê toàn bộ kho.
        /// </summary>
        public List<int>? BinLocationIds { get; set; }

        [Required]
        public DateTime PlannedStartDate { get; set; }

        [Required]
        public DateTime PlannedEndDate { get; set; }
    }
}
