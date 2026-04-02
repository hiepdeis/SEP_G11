using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("PurchaseRequests")]
public class PurchaseRequest
{
    [Key]
    [Column("RequestID")]
    public long RequestId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string RequestCode { get; set; } = null!;

    [Column("ProjectID")]
    public int ProjectId { get; set; }

    [Column("AlertID")]
    public long? AlertId { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    // Status flow: Submitted -> DraftPO -> POApproved -> Completed, Cancelled.
    public string Status { get; set; } = "Submitted";

    [ForeignKey("ProjectId")]
    [InverseProperty("PurchaseRequests")]
    public virtual Project Project { get; set; } = null!;

    [ForeignKey("AlertId")]
    [InverseProperty("PurchaseRequests")]
    public virtual StockShortageAlert? Alert { get; set; }

    [InverseProperty("PurchaseRequest")]
    public virtual ICollection<PurchaseRequestItem> Items { get; set; } = new List<PurchaseRequestItem>();

    [InverseProperty("PurchaseRequest")]
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}
