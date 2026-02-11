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

        [Required]
        public DateTime PlannedStartDate { get; set; }

        [Required]
        public DateTime PlannedEndDate { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }
}
