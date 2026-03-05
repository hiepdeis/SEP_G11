using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

[Index("IssueCode", Name = "UQ__IssueSli__1CF9DA76384C2914", IsUnique = true)]
public partial class IssueSlip
{
    [Key]
    [Column("IssueID")]
    public long IssueId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string IssueCode { get; set; } = null!;

    [Column("ProjectID")]
    public int ProjectId { get; set; }

    [Column("WarehouseID")]
    public int? WarehouseId { get; set; }

    [Column("ParentIssueID")]
    public long? ParentIssueId { get; set; }

    public int CreatedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? IssueDate { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }  // open, closed, cancel 

    [StringLength(500)]
    public string? Description { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("IssueSlips")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("Issue")]
    public virtual ICollection<IssueDetail> IssueDetails { get; set; } = new List<IssueDetail>();

    [ForeignKey("ProjectId")]
    [InverseProperty("IssueSlips")]
    public virtual Project Project { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("IssueSlips")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [ForeignKey("ParentIssueId")]
    [InverseProperty("ChildIssues")]
    public virtual IssueSlip? ParentIssue { get; set; }

    [InverseProperty("ParentIssue")]
    public virtual ICollection<IssueSlip> ChildIssues { get; set; } = new List<IssueSlip>();

    [Column(TypeName = "datetime")]
    public DateTime? ApprovedDate { get; set; }
}
