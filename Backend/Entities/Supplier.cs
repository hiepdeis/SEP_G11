using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("Code", Name = "UQ__Supplier__A25C5AA753AE5015", IsUnique = true)]
public partial class Supplier
{
    [Key]
    [Column("SupplierID")]
    public int SupplierId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Code { get; set; } = null!;

    [StringLength(255)]
    public string Name { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string? TaxCode { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }


    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierQuotation> SupplierQuotations { get; set; } = new List<SupplierQuotation>();
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierContract> SupplierContracts { get; set; } = new List<SupplierContract>();

    [InverseProperty("Supplier")]
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();

    [InverseProperty("Supplier")]
    public virtual ICollection<PurchaseOrderItem> PurchaseOrderItems { get; set; } = new List<PurchaseOrderItem>();

    [InverseProperty("Supplier")]
    public virtual ICollection<DirectPurchaseOrder> DirectPurchaseOrders { get; set; } = new List<DirectPurchaseOrder>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierTransaction> SupplierTransactions { get; set; } = new List<SupplierTransaction>();
}
