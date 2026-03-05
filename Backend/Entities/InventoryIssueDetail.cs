using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("InventoryIssueDetails")]
    public class InventoryIssueDetail
    {
        [Key]
        public long Id { get; set; }

        public long InventoryIssueId { get; set; }

        public long IssueDetailId { get; set; }

        public int BatchId { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal Quantity { get; set; }

        [ForeignKey("InventoryIssueId")]
        public virtual InventoryIssue InventoryIssue { get; set; } = null!;

        [ForeignKey("IssueDetailId")]
        public virtual IssueDetail IssueDetail { get; set; } = null!;

        [ForeignKey("BatchId")]
        public virtual Batch Batch { get; set; } = null!;
    }
}
