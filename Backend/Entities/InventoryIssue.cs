using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("InventoryIssues")]
    public class InventoryIssue
    {
        [Key]
        public long Id { get; set; }

        public long IssueSlipId { get; set; }

        [Required]
        [MaxLength(50)]
        public string IssueCode { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty;

        [ForeignKey("IssueSlipId")]
        public virtual IssueSlip IssueSlip { get; set; } = null!;

        public virtual ICollection<InventoryIssueDetail> Details { get; set; }
            = new List<InventoryIssueDetail>();
    }
}
