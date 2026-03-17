using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    public partial class StockTakeLock
    {
        [Key]
        public int LockId { get; set; }

        public int StockTakeId { get; set; }

        [StringLength(20)]
        public string ScopeType { get; set; } = null!; // Warehouse | Bin

        public int WarehouseId { get; set; }

        public int? BinId { get; set; }

        public bool IsActive { get; set; }

        public DateTime LockedAt { get; set; }

        public int? LockedBy { get; set; }

        public DateTime? UnlockedAt { get; set; }

        public int? UnlockedBy { get; set; }

        [ForeignKey(nameof(BinId))]
        [InverseProperty(nameof(BinLocation.StockTakeLocks))]
        public virtual BinLocation? Bin { get; set; }

        [ForeignKey(nameof(LockedBy))]
        [InverseProperty(nameof(User.StockTakeLockLockedByNavigations))]
        public virtual User? LockedByNavigation { get; set; }

        [ForeignKey(nameof(StockTakeId))]
        [InverseProperty(nameof(StockTake.StockTakeLocks))]
        public virtual StockTake StockTake { get; set; } = null!;

        [ForeignKey(nameof(UnlockedBy))]
        [InverseProperty(nameof(User.StockTakeLockUnlockedByNavigations))]
        public virtual User? UnlockedByNavigation { get; set; }

        [ForeignKey(nameof(WarehouseId))]
        [InverseProperty(nameof(Warehouse.StockTakeLocks))]
        public virtual Warehouse Warehouse { get; set; } = null!;
    }
}
