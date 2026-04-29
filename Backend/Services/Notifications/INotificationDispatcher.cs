namespace Backend.Services.Notifications;

/// <summary>
/// Điểm vào trung tâm để tạo thông báo trong hệ thống và tùy chọn gửi email.
/// </summary>
public interface INotificationDispatcher
{
    /// <summary>
    /// Gửi thông báo đến danh sách người nhận được chỉ định sẵn.
    ///
    /// Luồng nghiệp vụ:
    /// 1) Chuẩn hóa và kiểm tra hợp lệ request.
    /// 2) Tạo các dòng Notification.
    /// 3) Luu vao database (khi SaveChanges=true).
    /// 4) Gửi email (khi SendEmail=true và SMTP đã cấu hình).
    /// </summary>
    Task<NotificationDispatchResult> DispatchAsync(
        NotificationDispatchRequest request,
        CancellationToken ct);

    /// <summary>
    /// Gửi thông báo đến tất cả người dùng trong một vai trò, có thể khai báo vai trò dự phòng.
    /// Sau đó tái sử dụng <see cref="DispatchAsync(NotificationDispatchRequest, CancellationToken)"/>
    /// để luồng theo role và luồng gửi trực tiếp dùng chung một bộ business rule.
    /// </summary>
    Task<NotificationDispatchResult> DispatchToRoleAsync(
        NotificationRoleDispatchRequest request,
        CancellationToken ct);
}