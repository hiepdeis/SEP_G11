using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("StockShortageAlerts")]
public class StockShortageAlert
{
    [Key]
    [Column("AlertID")]
    public long AlertId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("WarehouseID")]
    public int? WarehouseId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal CurrentQuantity { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? MinStockLevel { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? SuggestedQuantity { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string Status { get; set; } = "Pending";

    [StringLength(20)]
    [Unicode(false)]
    public string? Priority { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? ConfirmedAt { get; set; }

    public int? ConfirmedBy { get; set; }

    [ForeignKey("ConfirmedBy")]
    [InverseProperty("StockShortageAlertsConfirmedByNavigations")]
    public virtual User? ConfirmedByUser { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("StockShortageAlerts")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("StockShortageAlerts")]
    public virtual Warehouse? Warehouse { get; set; }

    [InverseProperty("Alert")]
    public virtual ICollection<PurchaseRequest> PurchaseRequests { get; set; } = new List<PurchaseRequest>();
}
