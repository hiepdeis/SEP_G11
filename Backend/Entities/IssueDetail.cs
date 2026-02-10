using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class IssueDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("IssueID")]
    public long IssueId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? UnitPrice { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("IssueDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("IssueId")]
    [InverseProperty("IssueDetails")]
    public virtual IssueSlip Issue { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("IssueDetails")]
    public virtual Material Material { get; set; } = null!;
}
