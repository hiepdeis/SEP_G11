using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("PurchaseOrders")]
public class PurchaseOrder
{
    [Key]
    [Column("PurchaseOrderID")]
    public long PurchaseOrderId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string PurchaseOrderCode { get; set; } = null!;

    [Column("RequestID")]
    public long? RequestId { get; set; }

    [Column("ProjectID")]
    public int? ProjectId { get; set; }

    [Column("SupplierID")]
    public int SupplierId { get; set; }

    [Column("SupplierContractID")]
    public long? SupplierContractId { get; set; }

    [Column("ParentPOID")]
    public long? ParentPOId { get; set; }

    public int RevisionNumber { get; set; } = 1;

    [StringLength(500)]
    public string? RevisionNote { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [StringLength(30)]
    [Unicode(false)]
    public string Status { get; set; } = "Draft";

    public int? AccountantApprovedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? AccountantApprovedAt { get; set; }

    public int? AdminApprovedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? AdminApprovedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? SentToSupplierAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ExpectedDeliveryDate { get; set; }

    [StringLength(500)]
    public string? SupplierNote { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? TotalAmount { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("PurchaseOrders")]
    public virtual Project? Project { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("PurchaseOrders")]
    public virtual Supplier Supplier { get; set; } = null!;

    [ForeignKey("SupplierContractId")]
    [InverseProperty("PurchaseOrders")]
    public virtual SupplierContract? SupplierContract { get; set; }

    [ForeignKey("RequestId")]
    [InverseProperty("PurchaseOrders")]
    public virtual PurchaseRequest? PurchaseRequest { get; set; }

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<SupplementaryReceipt> SupplementaryReceipts { get; set; } = new List<SupplementaryReceipt>();

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<ReceiptRejectionHistory> RejectionHistories { get; set; } = new List<ReceiptRejectionHistory>();

    [InverseProperty("PurchaseOrder")]
    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    [ForeignKey("ParentPOId")]
    [InverseProperty("ChildRevisions")]
    public virtual PurchaseOrder? ParentPO { get; set; }

    [InverseProperty("ParentPO")]
    public virtual ICollection<PurchaseOrder> ChildRevisions { get; set; } = new List<PurchaseOrder>();
}
