using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;



namespace Backend.Entities
{
    [Table("DirectPurchaseOrders")]
    public class DirectPurchaseOrder
    {
        [Key]
        [Column("DPOID")]
        public long DpoId { get; set; }

        [Required]
        [StringLength(50)]
        public string DpoCode { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string ReferenceCode { get; set; } = null!; // Link về IssueCode của yêu cầu ban đầu

        [Column("SupplierID")]
        public int? SupplierId { get; set; }

        [Column("ProjectID")]
        public int ProjectId { get; set; }

        public int CreatedBy { get; set; }

        public DateTime? OrderDate { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }

        [StringLength(500)]
        public string? DeliveryAddress { get; set; }

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Draft_DPO";

        [Column(TypeName = "decimal(18, 4)")]
        public decimal TotalAmount { get; set; }

        public string? Description { get; set; }

        // --- Navigation Properties ---
        [ForeignKey("SupplierId")]
        [InverseProperty("DirectPurchaseOrders")]
        public virtual Supplier Supplier { get; set; } = null!;

        // Tùy thuộc vào tên Entity Project của bạn, có thể mở comment dòng dưới
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; } = null!;

        [InverseProperty("DirectPurchaseOrder")]
        public virtual ICollection<DirectPurchaseDetail> DirectPurchaseDetails { get; set; } = new List<DirectPurchaseDetail>();
    }
}
