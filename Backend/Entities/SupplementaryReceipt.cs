using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("SupplementaryReceipts")]
public class SupplementaryReceipt
{
    [Key]
    [Column("SupplementaryReceiptID")]
    public long SupplementaryReceiptId { get; set; }

    [Column("ParentReceiptID")]
    public long? ParentReceiptId { get; set; }

    public int RevisionNumber { get; set; } = 1;

    [Column("PurchaseOrderID")]
    public long PurchaseOrderId { get; set; }

    [Column("IncidentID")]
    public long IncidentId { get; set; }

    [Required]
    [StringLength(30)]
    [Unicode(false)]
    public string Status { get; set; } = "PendingManagerApproval";

    [StringLength(1000)]
    public string? SupplierNote { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ExpectedDeliveryDate { get; set; }

    public int CreatedByPurchasingId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    public int? ApprovedByManagerId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ApprovedAt { get; set; }

    [ForeignKey("PurchaseOrderId")]
    [InverseProperty("SupplementaryReceipts")]
    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;

    [ForeignKey("IncidentId")]
    [InverseProperty("SupplementaryReceipts")]
    public virtual IncidentReport IncidentReport { get; set; } = null!;

    [ForeignKey("ParentReceiptId")]
    [InverseProperty("ChildRevisions")]
    public virtual SupplementaryReceipt? ParentReceipt { get; set; }

    [InverseProperty("SupplementaryReceipt")]
    public virtual ICollection<SupplementaryReceiptItem> Items { get; set; } = new List<SupplementaryReceiptItem>();

    [InverseProperty("SupplementaryReceipt")]
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [InverseProperty("SupplementaryReceipt")]
    public virtual ICollection<ReceiptRejectionHistory> RejectionHistories { get; set; } = new List<ReceiptRejectionHistory>();

    [InverseProperty("ParentReceipt")]
    public virtual ICollection<SupplementaryReceipt> ChildRevisions { get; set; } = new List<SupplementaryReceipt>();
}
