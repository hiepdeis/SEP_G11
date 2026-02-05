using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Notification
{
    public long NotiId { get; set; }

    public int? UserId { get; set; }

    public string? Message { get; set; }

    public bool? IsRead { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
