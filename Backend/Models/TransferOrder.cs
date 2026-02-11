using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class TransferOrder
{
    public long TransferId { get; set; }

    public string? TransferCode { get; set; }

    public int WarehouseId { get; set; }

    public int CreatedBy { get; set; }

    public int? AssignedTo { get; set; }

    public DateTime? TransferDate { get; set; }

    public string? Status { get; set; }

    public string? Type { get; set; }

    public virtual User? AssignedToNavigation { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<TransferDetail> TransferDetails { get; set; } = new List<TransferDetail>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
