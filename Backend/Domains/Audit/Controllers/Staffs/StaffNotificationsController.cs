using Backend.Data;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Notifications.Controllers.Staffs;

[ApiController]
[Route("api/staff/notifications")]
[Authorize(Roles = "Staff")]
public class StaffNotificationsController : ControllerBase
{
    private readonly MyDbContext _db;

    public StaffNotificationsController(MyDbContext db)
    {
        _db = db;
    }

    private int GetUserId()
    {
        return User.GetRequiredUserId();
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var userId = GetUserId();

        if (take <= 0) take = 50;
        if (take > 200) take = 200;
        if (skip < 0) skip = 0;

        var q = _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            q = q.Where(n => n.IsRead == false);

        var data = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(n => new
            {
                notiId = n.NotiId,
                message = n.Message,
                isRead = n.IsRead,
                createdAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(data);
    }

    [HttpPut("{notiId:long}/read")]
    public async Task<IActionResult> MarkRead(long notiId, CancellationToken ct)
    {
        var userId = GetUserId();

        var n = await _db.Notifications
            .FirstOrDefaultAsync(x => x.NotiId == notiId && x.UserId == userId, ct);

        if (n == null) return NotFound(new { message = "Notification not found." });

        if (n.IsRead == false)
        {
            n.IsRead = true;
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { message = "Marked as read." });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        var userId = GetUserId();
        var count = await _db.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && n.IsRead == false, ct);

        return Ok(new { unread = count });
    }
}
