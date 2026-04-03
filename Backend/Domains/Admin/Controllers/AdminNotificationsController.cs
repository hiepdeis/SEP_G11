using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]

    [Route("api/admin/notifications/hotfix")]

    //[Authorize] // nếu bạn có policy riêng thì đổi thành [Authorize(Roles = "Admin")]
    public sealed class AdminNotificationsController : ControllerBase
    {
        private readonly INotificationAdminService _service;

        public AdminNotificationsController(INotificationAdminService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<NotificationPagedResult<NotificationListItemDto>>> GetNotifications(
            [FromQuery] NotificationQueryDto query,
            CancellationToken ct)
        {
            var result = await _service.GetNotificationsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("users")]
        public async Task<ActionResult<List<NotificationUserLookupDto>>> GetUsers(CancellationToken ct)
        {
            var result = await _service.GetUsersAsync(ct);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<NotificationCreateResultDto>> Create(
            [FromBody] CreateNotificationDto request,
            CancellationToken ct)
        {
            var result = await _service.CreateAsync(request, ct);
            return Ok(result);
        }

        [HttpPatch("{id:long}/read")]
        public async Task<IActionResult> MarkAsRead(long id, CancellationToken ct)
        {
            var ok = await _service.MarkAsReadAsync(id, ct);
            if (!ok) return NotFound(new { message = "Notification not found." });

            return Ok(new { message = "Marked as read." });
        }

        [HttpPatch("mark-all-read")]
        public async Task<IActionResult> MarkAllRead(
            [FromBody] MarkAllNotificationsReadDto request,
            CancellationToken ct)
        {
            var affected = await _service.MarkAllAsReadAsync(request.UserId, ct);
            return Ok(new { affected });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var ok = await _service.DeleteAsync(id, ct);
            if (!ok) return NotFound(new { message = "Notification not found." });

            return Ok(new { message = "Deleted successfully." });
        }
    }
}