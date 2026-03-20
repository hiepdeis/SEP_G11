using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Controllers.Managers
{
    [ApiController]
    [Route("api/warehouse-manager/notifications")]
    public class WarehouseManagerNotificationsController : ControllerBase
    {
        private readonly MyDbContext _db;

        public WarehouseManagerNotificationsController(MyDbContext db)
        {
            _db = db;
        }

        private int GetManagerId()
        {
            return 2; // TODO: replace with JWT claims
        }

        [HttpGet]
        public async Task<IActionResult> GetUnreadNotifications(
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            var managerId = GetManagerId();

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var data = await _db.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == managerId && n.IsRead == false)
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
