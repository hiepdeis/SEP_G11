using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("DirectPurchaseDetails")]
    public class DirectPurchaseDetail
    {
        [Key]
        [Column("DPODetailID")]
        public long DpoDetailId { get; set; }

        [Column("DPOID")]
        public long DpoId { get; set; }

        [Column("MaterialID")]
        public int MaterialId { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal NegotiatedUnitPrice { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column(TypeName = "decimal(18, 4)")]
        public decimal? LineTotal { get; set; }

        // --- Navigation Properties ---
        [ForeignKey("DpoId")]
        [InverseProperty("DirectPurchaseDetails")]
        public virtual DirectPurchaseOrder DirectPurchaseOrder { get; set; } = null!;

        // Tùy thuộc vào tên Entity Material của bạn, có thể mở comment dòng dưới
        [ForeignKey("MaterialId")]
        public virtual Material Material { get; set; } = null!;

        [Column("SupplierID")]
        public int? SupplierId { get; set; }

        [ForeignKey("SupplierId")]
        public virtual Supplier? Supplier { get; set; }
    }
}
