namespace Backend.Domains.Audit.Interfaces
{
    /// <summary>
    /// Service to check whether a bin or warehouse is locked by an active audit.
    /// Used by Import/Outbound flows to block transactions on locked bins.
    /// </summary>
    public interface IAuditLockCheckService
    {
        /// <summary>
        /// Returns the list of bin IDs that are locked by an active audit for the given warehouse.
        /// If the entire warehouse is locked, returns null (meaning ALL bins are locked).
        /// If no locks are active, returns an empty list.
        /// </summary>
        Task<AuditLockInfo> GetLockedBinsAsync(int warehouseId, CancellationToken ct = default);

        /// <summary>
        /// Checks if a specific bin in a specific warehouse is locked by an active audit.
        /// </summary>
        Task<bool> IsBinLockedAsync(int warehouseId, int binId, CancellationToken ct = default);

        /// <summary>
        /// Checks whether ALL bins in the collection are unlocked. If any are locked,
        /// returns a descriptive error message. Returns null if all bins are clear.
        /// </summary>
        Task<string?> CheckBinsForLockAsync(int warehouseId, IEnumerable<int> binIds, CancellationToken ct = default);
    }

    public class AuditLockInfo
    {
        /// <summary>True if the entire warehouse is locked (scope = Warehouse).</summary>
        public bool IsWarehouseLocked { get; set; }

        /// <summary>List of individual locked bin IDs (scope = Bin). Empty if none.</summary>
        public List<int> LockedBinIds { get; set; } = new();
    }
}
