using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("PickingList")]
    public partial class PickingList
    {
        [Key]
        [Column("PickingID")]
        public long PickingId { get; set; }

        [Column("IssueDetailID")]
        public long IssueDetailId { get; set; }

        [Column("BatchID")]
        public int BatchId { get; set; }

        [Column("BinID")]
        public int BinId { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal QtyToPick { get; set; }

        [Column("IsPicked")]
        public bool IsPicked { get; set; }

        // --- Navigation Properties (Liên kết bảng) ---

        [ForeignKey("IssueDetailId")]
        [InverseProperty("PickingLists")]
        public virtual IssueDetail IssueDetail { get; set; } = null!;

        [ForeignKey("BatchId")]
        [InverseProperty("PickingLists")]
        public virtual Batch Batch { get; set; } = null!;

        [ForeignKey("BinId")]
        [InverseProperty("PickingLists")]
        public virtual BinLocation Bin { get; set; } = null!;
    }
}
