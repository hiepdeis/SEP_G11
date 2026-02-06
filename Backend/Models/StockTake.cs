using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class StockTake
{
    public int StockTakeId { get; set; }

    public int? WarehouseId { get; set; }

    public DateTime? CheckDate { get; set; }

    public int? CreatedBy { get; set; }

    public string? Status { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    public virtual Warehouse? Warehouse { get; set; }
}
