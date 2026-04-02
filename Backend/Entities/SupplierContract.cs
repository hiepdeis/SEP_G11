using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("SupplierContracts")]
public class SupplierContract
{
    [Key]
    [Column("ContractID")]
    public long ContractId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string ContractCode { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string? ContractNumber { get; set; }

    [Column("SupplierID")]
    public int SupplierId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime EffectiveFrom { get; set; }

    [NotMapped]
    public DateTime StartDate
    {
        get => EffectiveFrom;
        set => EffectiveFrom = value;
    }

    [Column(TypeName = "datetime")]
    public DateTime? EffectiveTo { get; set; }

    [NotMapped]
    public DateTime? EndDate
    {
        get => EffectiveTo;
        set => EffectiveTo = value;
    }

    public int? LeadTimeDays { get; set; }

    [StringLength(200)]
    [Unicode(false)]
    public string? PaymentTerms { get; set; }

    [StringLength(200)]
    [Unicode(false)]
    public string? DeliveryTerms { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string Status { get; set; } = "Active";

    public bool IsActive { get; set; } = true;

    [StringLength(500)]
    public string? Notes { get; set; }

    [ForeignKey("SupplierId")]
    [InverseProperty("SupplierContracts")]
    public virtual Supplier Supplier { get; set; } = null!;

    [InverseProperty("SupplierContract")]
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}
