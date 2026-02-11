using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class SupplierQuotation
{
    [Key]
    [Column("QuoteID")]
    public int QuoteId { get; set; }

    [Column("SupplierID")]
    public int SupplierId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Price { get; set; }

    [StringLength(10)]
    [Unicode(false)]
    public string? Currency { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ValidFrom { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ValidTo { get; set; }

    public bool? IsActive { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("SupplierQuotations")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("SupplierId")]
    [InverseProperty("SupplierQuotations")]
    public virtual Supplier Supplier { get; set; } = null!;
}
