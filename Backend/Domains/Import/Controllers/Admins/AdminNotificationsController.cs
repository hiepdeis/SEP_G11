using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Admins
{
    [ApiController]
    [Route("api/admin/notifications")]
    public class AdminNotificationsController : ControllerBase
    {
        private readonly MyDbContext _db;

        public AdminNotificationsController(MyDbContext db)
        {
            _db = db;
        }

        private int GetAdminId()
        {
            return 1; // TODO: replace with JWT claims
        }

        [HttpGet]
        public async Task<IActionResult> GetUnreadNotifications(
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            var adminId = GetAdminId();

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var data = await _db.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == adminId && n.IsRead == false)
                .OrderByDescending(n => n.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(n => new
                {
                    notiId = n.NotiId,
                    message = n.Message,
                    relatedEntityType = n.RelatedEntityType,
                    relatedEntityId = n.RelatedEntityId,
                    createdAt = n.CreatedAt
                })
                .ToListAsync(ct);

            return Ok(data);
        }
    }
}
