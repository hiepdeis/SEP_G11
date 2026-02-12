using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Domains.Notifications.Controllers.Staffs;

[ApiController]
[Route("api/staff/notifications")]
//[Authorize(Roles = "Warehouse Staff")]
public class StaffNotificationsController : ControllerBase
{
    private readonly MyDbContext _db;
    private readonly IWebHostEnvironment _env;

    public StaffNotificationsController(MyDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private int GetUserId()
    {
        return 13;// FIX CỨNG để test
        //var idStr =
        //    User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        //    User.FindFirstValue("userId") ??
        //    User.FindFirstValue("id") ??
        //    User.FindFirstValue("sub");

        //if (int.TryParse(idStr, out var uid)) return uid;

        //// DEV fallback: cho phép set header X-Debug-UserId khi test swagger/local
        //if (_env.IsDevelopment() && Request.Headers.TryGetValue("X-Debug-UserId", out var h))
        //{
        //    if (int.TryParse(h.ToString(), out uid)) return uid;
        //}

        //throw new UnauthorizedAccessException("Invalid user identity.");
    }

    // GET /api/staff/notifications?unreadOnly=true&skip=0&take=50
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
                notiId = n.NotiId,     // đổi theo entity bạn nếu khác
                message = n.Message,
                isRead = n.IsRead,
                createdAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(data);
    }

    // PUT /api/staff/notifications/{notiId}/read
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

    // (Optional) GET /api/staff/notifications/unread-count
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
