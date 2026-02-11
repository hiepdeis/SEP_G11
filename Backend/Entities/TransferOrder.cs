using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class TransferOrder
{
    [Key]
    [Column("TransferID")]
    public long TransferId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string? TransferCode { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public int? AssignedTo { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? TransferDate { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Type { get; set; }

    [ForeignKey("AssignedTo")]
    [InverseProperty("TransferOrderAssignedToNavigations")]
    public virtual User? AssignedToNavigation { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("TransferOrderCreatedByNavigations")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("Transfer")]
    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("TransferOrders")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
