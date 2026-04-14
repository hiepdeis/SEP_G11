using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities
{
    [Table("SupplierTransactions")]
    public class SupplierTransaction
    {
        [Key]
        [Column("TransactionID")]
        public long TransactionId { get; set; }

        [Column("SupplierID")]
        public int SupplierId { get; set; }

        [Column("ReferenceID")]
        public long? ReferenceId { get; set; }

        [StringLength(50)]
        public string? ReferenceCode { get; set; }

        [StringLength(50)]
        public string TransactionType { get; set; } = null!; // Ví dụ: "Purchase" (Tăng nợ), "Payment" (Giảm nợ)

        [Column(TypeName = "decimal(18, 4)")]
        public decimal Amount { get; set; }

        [Column("TransactionDate")]
        public DateTime TransactionDate { get; set; }

        public string? Description { get; set; }

        [ForeignKey("SupplierId")]
        [InverseProperty("SupplierTransactions")]
        public virtual Supplier Supplier { get; set; } = null!;
    }
}
