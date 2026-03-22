using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class AdminUserService : IAdminUserService
    {
        private readonly MyDbContext _db;


        public AdminUserService(MyDbContext db)
        {
            _db = db;

        }

        public async Task<PagedResult<UserListItemDto>> GetUsersAsync(GetUsersQuery query, CancellationToken ct)
        {
            var q =
                from u in _db.Users.AsNoTracking()
                join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
                select new UserListItemDto
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    RoleId = u.RoleId,
                    RoleName = r.RoleName,
                    FullName = u.FullName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    Status = u.Status
                };

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var keyword = query.Search.Trim().ToLower();
                q = q.Where(x =>
                    (x.Username ?? "").ToLower().Contains(keyword) ||
                    (x.FullName ?? "").ToLower().Contains(keyword) ||
                    (x.Email ?? "").ToLower().Contains(keyword));
            }

            if (query.Status.HasValue)
                q = q.Where(x => x.Status == query.Status.Value);

            if (query.RoleId.HasValue)
                q = q.Where(x => x.RoleId == query.RoleId.Value);

            q = (query.SortBy?.ToLower(), query.SortDir?.ToLower()) switch
            {
                ("userid", "desc") => q.OrderByDescending(x => x.UserId),
                ("userid", _) => q.OrderBy(x => x.UserId),

                ("username", "desc") => q.OrderByDescending(x => x.Username),
                ("username", _) => q.OrderBy(x => x.Username),

                ("email", "desc") => q.OrderByDescending(x => x.Email),
                ("email", _) => q.OrderBy(x => x.Email),

                ("status", "desc") => q.OrderByDescending(x => x.Status),
                ("status", _) => q.OrderBy(x => x.Status),

                ("fullname", "desc") => q.OrderByDescending(x => x.FullName),
                _ => q.OrderBy(x => x.FullName)
            };

            var totalItems = await q.CountAsync(ct);
            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(ct);

            return new PagedResult<UserListItemDto>
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)query.PageSize)
            };
        }

        public async Task<UserListItemDto?> GetByIdAsync(int userId, CancellationToken ct)
        {
            return await (
                from u in _db.Users.AsNoTracking()
                join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
                where u.UserId == userId
                select new UserListItemDto
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    RoleId = u.RoleId,
                    RoleName = r.RoleName,
                    FullName = u.FullName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    Status = u.Status
                }
            ).FirstOrDefaultAsync(ct);
        }



        public async Task<bool> UpdateAsync(int userId, UpdateUserRequest request, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null) return false;

            var roleExists = await _db.Roles.AnyAsync(x => x.RoleId == request.RoleId, ct);
            if (!roleExists) throw new ArgumentException("Role không tồn tại.");

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailExists = await _db.Users.AnyAsync(x => x.Email == request.Email && x.UserId != userId, ct);
                if (emailExists) throw new ArgumentException("Email đã tồn tại.");
            }

            user.RoleId = request.RoleId;
            user.FullName = request.FullName.Trim();
            user.Email = request.Email?.Trim();
            user.PhoneNumber = request.PhoneNumber?.Trim();
            user.Status = request.Status;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> ChangeStatusAsync(int userId, bool status, int currentUserId, CancellationToken ct)
        {
            if (userId == currentUserId && status == false)
                throw new ArgumentException("Bạn không thể tự khóa chính mình.");

            var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null) return false;

            user.Status = status;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> ChangeRoleAsync(int userId, int roleId, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null) return false;

            var roleExists = await _db.Roles.AnyAsync(x => x.RoleId == roleId, ct);
            if (!roleExists) throw new ArgumentException("Role không tồn tại.");

            user.RoleId = roleId;
            await _db.SaveChangesAsync(ct);
            return true;
        }
        public async Task<List<RoleDto>> GetRolesAsync(CancellationToken ct)
        {
            return await _db.Roles
                .AsNoTracking()
                .OrderBy(x => x.RoleName)
                .Select(x => new RoleDto
                {
                    RoleId = x.RoleId,
                    RoleName = x.RoleName
                })
                .ToListAsync(ct);
        }
    }

}