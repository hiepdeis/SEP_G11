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
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [InverseProperty("Supplier")]
    public virtual ICollection<SupplierQuotation> SupplierQuotations { get; set; } = new List<SupplierQuotation>();
}
