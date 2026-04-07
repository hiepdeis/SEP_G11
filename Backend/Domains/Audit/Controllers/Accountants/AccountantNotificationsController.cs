using Backend.Data;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Notifications.Controllers
{
    [ApiController]
    [Route("api/accountant/notifications")]
    [Authorize(Roles = "Accountant,accountant")]
    public class AccountantNotificationsController : ControllerBase
    {
        private readonly MyDbContext _db;

        public AccountantNotificationsController(MyDbContext db)
        {
            _db = db;
        }

        private int GetUserId()
        {
            return User.GetRequiredUserId();
        }

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications(
            [FromQuery] int skip = 0, 
            [FromQuery] int take = 50, 
            CancellationToken ct = default)
        {
            var userId = GetUserId();
            var data = await _db.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(n => new
                {
                    notiId = n.NotiId,
                    message = n.Message,
                    relatedEntityType = n.RelatedEntityType,
                    relatedEntityId = n.RelatedEntityId,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt
                })
                .ToListAsync(ct);

            return Ok(data);
        }

        [HttpPut("{notiId:long}/read")]
        public async Task<IActionResult> MarkRead(long notiId, CancellationToken ct)
        {
            var n = await _db.Notifications
                .FirstOrDefaultAsync(x => x.NotiId == notiId && x.UserId == GetUserId(), ct);

            if (n != null && n.IsRead == false)
            {
                n.IsRead = true;
                await _db.SaveChangesAsync(ct);
            }
            return Ok(new { message = "Marked as read." });
        }
    }
}