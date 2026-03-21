using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities
{
    [Index(nameof(IssueId), nameof(Step), nameof(StepOrder))]
    public class IssueSlipApproval
    {
        [Key]
        public long Id { get; set; }

        [Column("IssueID")]
        public long IssueId { get; set; }

        [StringLength(50)]
        [Unicode(false)]
        public string Step { get; set; } = null!;
        // Accountant, Admin, Warehouse, Delivery...

        public int StepOrder { get; set; }
        // 1,2,3,4 (thứ tự flow)

        public int? ApprovedBy { get; set; }

        [Column(TypeName = "datetime")]
        public DateTime? ApprovedDate { get; set; }

        [StringLength(20)]
        [Unicode(false)]
        public string Status { get; set; } = "Pending";
        // Pending, Approved, Rejected

        [StringLength(500)]
        public string? Note { get; set; }

        // Navigation
        [ForeignKey("IssueId")]
        [InverseProperty("Approvals")]
        public virtual IssueSlip Issue { get; set; } = null!;

        [ForeignKey("ApprovedBy")]
        public virtual User? User { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
