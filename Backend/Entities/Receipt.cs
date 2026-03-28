using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("ReceiptCode", Name = "UQ__Receipts__1AB76D000841B5BB", IsUnique = true)]
public partial class Receipt
{
    [Key]
    [Column("ReceiptID")]
    public long ReceiptId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string ReceiptCode { get; set; } = null!;

    [Column("WarehouseID")]
    public int? WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ReceiptDate { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TotalAmount { get; set; }

    public int? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int? RejectedBy { get; set; }
    public DateTime? RejectedAt { get; set; }
    public int? ConfirmedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? ImportedCompleteNote { get; set; }
    public string? RejectionReason { get; set; }
    public string? AccountantNotes { get; set; }
    public string? BackorderReason { get; set; }

    [Column("PurchaseOrderID")]
    public long? PurchaseOrderId { get; set; }

    [Column("ParentRequestID")]
    public long? ParentRequestId { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("Receipts")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [ForeignKey("ParentRequestId")]
    [InverseProperty("ChildRequests")]
    public virtual Receipt? ParentRequest { get; set; }

    [ForeignKey("PurchaseOrderId")]
    [InverseProperty("Receipts")]
    public virtual PurchaseOrder? PurchaseOrder { get; set; }

    [InverseProperty("ParentRequest")]
    public virtual ICollection<Receipt> ChildRequests { get; set; } = new List<Receipt>();

    [InverseProperty("Receipt")]
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    [InverseProperty("Receipt")]
    public virtual ICollection<ReceiptRejectionHistory> RejectionHistories { get; set; } = new List<ReceiptRejectionHistory>();

    [InverseProperty("Receipt")]
    public virtual ICollection<QCCheck> QCChecks { get; set; } = new List<QCCheck>();

    [InverseProperty("Receipt")]
    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("Receipts")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
