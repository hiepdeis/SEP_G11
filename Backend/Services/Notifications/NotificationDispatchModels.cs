namespace Backend.Services.Notifications;

/// <summary>
/// Dữ liệu người nhận được sử dụng bởi notification dispatcher.
/// UserId là khóa danh tính trong bảng Notification.
/// </summary>
public sealed record NotificationRecipient(
    int UserId,
    string? DisplayName = null,
    string? Email = null);

/// <summary>
/// Request gửi trực tiếp đến danh sách người nhận được cung cấp.
/// </summary>
public sealed class NotificationDispatchRequest
{
    /// <summary>
    /// Danh sách người nhận mục tiêu. Dispatcher sẽ loại trùng theo UserId.
    /// </summary>
    public IReadOnlyCollection<NotificationRecipient> Recipients { get; init; } =
        Array.Empty<NotificationRecipient>();

    /// <summary>
    /// Nội dung thông báo để người dùng đọc được trên app và trong email.
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// Tên đối tượng nghiệp vụ mà thông báo trỏ đến, ví dụ: Receipt, PurchaseOrder.
    /// </summary>
    public string? RelatedEntityType { get; init; }

    /// <summary>
    /// Id của đối tượng nghiệp vụ được tham chiếu bởi RelatedEntityType.
    /// </summary>
    public long? RelatedEntityId { get; init; }

    /// <summary>
    /// True để gửi thêm email bên cạnh thông báo trong app.
    /// </summary>
    public bool SendEmail { get; init; }

    /// <summary>
    /// Tùy chọn override danh sách người nhận email.
    /// Notification vẫn được tạo cho Recipients.
    /// </summary>
    public IReadOnlyCollection<NotificationRecipient>? EmailRecipientsOverride { get; init; }

    /// <summary>
    /// True để đẩy việc gửi email sang background, tránh chặn request.
    /// </summary>
    public bool SendEmailInBackground { get; init; }

    /// <summary>
    /// True để lưu các dòng Notification ngay trong lần gọi này.
    /// Bắt buộc true khi SendEmail=true để tránh gửi email cho thông báo chưa được lưu.
    /// </summary>
    public bool SaveChanges { get; init; } = true;
}

/// <summary>
/// Request gửi theo vai trò. Service sẽ resolve người nhận theo role,
/// sau đó chạy cùng pipeline với luồng gửi trực tiếp.
/// </summary>
public sealed class NotificationRoleDispatchRequest
{
    /// <summary>
    /// Tên role chính được dùng để resolve người nhận.
    /// </summary>
    public string RoleName { get; init; } = string.Empty;

    /// <summary>
    /// Role dự phòng khi role chính không có người nhận.
    /// </summary>
    public string? FallbackRoleName { get; init; }

    /// <summary>
    /// True để chỉ lấy người dùng đang active.
    /// </summary>
    public bool OnlyActiveUsers { get; init; } = true;

    public string Message { get; init; } = string.Empty;

    public string? RelatedEntityType { get; init; }

    public long? RelatedEntityId { get; init; }

    public bool SendEmail { get; init; }

    public bool SendEmailInBackground { get; init; }

    public bool SaveChanges { get; init; } = true;
}

/// <summary>
/// Tổng kết kết quả dispatch để trả về API và phục vụ đối soát.
/// </summary>
public sealed class NotificationDispatchResult
{
    /// <summary>
    /// Số dòng Notification đã tạo.
    /// </summary>
    public int NotificationCount { get; init; }

    /// <summary>
    /// Danh sách id Notification đã tạo (chỉ có khi SaveChanges=true).
    /// </summary>
    public IReadOnlyList<long> NotificationIds { get; init; } = Array.Empty<long>();

    /// <summary>
    /// Mốc thời gian UTC được dùng làm CreatedAt cho batch dispatch này.
    /// </summary>
    public DateTime CreatedAtUtc { get; init; }

    public bool EmailRequested { get; init; }

    public bool EmailConfigured { get; init; }

    public int EmailSentCount { get; init; }

    public int EmailMissingAddressCount { get; init; }

    public int EmailFailedCount { get; init; }
}