using Backend.Models;

namespace Backend.Entities
{
    public partial class AdjustmentReason
    {
        public int ReasonId { get; set; }

        public string Code { get; set; } = null!;

        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        public bool IsActive { get; set; }

        public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

        public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();
    }

}
