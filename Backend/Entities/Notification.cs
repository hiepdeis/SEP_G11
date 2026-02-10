using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class Notification
{
    [Key]
    [Column("NotiID")]
    public long NotiId { get; set; }

    [Column("UserID")]
    public int UserId { get; set; }

    [StringLength(500)]
    public string? Message { get; set; }

    public bool? IsRead { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("Notifications")]
    public virtual User User { get; set; } = null!;
}
