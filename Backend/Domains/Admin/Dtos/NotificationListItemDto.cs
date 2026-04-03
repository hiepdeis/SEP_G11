namespace Backend.Domains.Admin.Dtos
{
    public sealed class NotificationListItemDto
    {
        public long NotiId { get; set; }
        public int UserId { get; set; }
        public string UserFullName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public sealed class NotificationQueryDto
    {
        public string? Keyword { get; set; }
        public int? UserId { get; set; }
        public bool? IsRead { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 8;
    }

    public sealed class CreateNotificationDto
    {
        /// <summary>
        /// "single" | "all"
        /// </summary>
        public string TargetMode { get; set; } = "single";

        /// <summary>
        /// bắt buộc khi TargetMode = "single"
        /// </summary>
        public int? UserId { get; set; }

        public string Message { get; set; } = null!;
    }

    public sealed class MarkAllNotificationsReadDto
    {
        /// <summary>
        /// null = tất cả user
        /// </summary>
        public int? UserId { get; set; }
    }

    public sealed class NotificationCreateResultDto
    {
        public int SentCount { get; set; }
        public List<long> NotificationIds { get; set; } = new();
    }

    public sealed class NotificationUserLookupDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;
        public bool Status { get; set; }
    }

    public sealed class NotificationPagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }
}