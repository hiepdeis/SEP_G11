namespace Backend.Entities
{
    public partial class StockTakeTeamMember
    {
        public long Id { get; set; }

        public int StockTakeId { get; set; }

        public int UserId { get; set; }

        public string? RoleInTeam { get; set; }

        public DateTime AssignedAt { get; set; }

        public DateTime? RemovedAt { get; set; }

        public bool IsActive { get; set; }

        public virtual StockTake StockTake { get; set; } = null!;

        public virtual User User { get; set; } = null!;
    }

}
