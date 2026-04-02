using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class AdminUserService : IAdminUserService
    {
        private const string AdminRoleName = "Admin";
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
                where r.RoleName.ToLower() != AdminRoleName.ToLower()
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

        private async Task<int?> GetAdminRoleIdAsync(CancellationToken ct)
        {
            return await _db.Roles
                .AsNoTracking()
                .Where(x => x.RoleName.ToLower() == AdminRoleName.ToLower())
                .Select(x => (int?)x.RoleId)
                .FirstOrDefaultAsync(ct);
        }

        private async Task EnsureCannotAssignAdminRoleAsync(User user, int requestedRoleId, CancellationToken ct)
        {
            var adminRoleId = await GetAdminRoleIdAsync(ct);
            if (!adminRoleId.HasValue)
                return;

            var isPromotingToAdmin = requestedRoleId == adminRoleId.Value && user.RoleId != adminRoleId.Value;
            if (isPromotingToAdmin)
                throw new ArgumentException("Không thể phân quyền Admin cho người dùng khác.");
        }

        private async Task EnsureActiveAdminStillExistsAsync(User user, int requestedRoleId, bool requestedStatus, CancellationToken ct)
        {
            var adminRoleId = await GetAdminRoleIdAsync(ct);
            if (!adminRoleId.HasValue || user.RoleId != adminRoleId.Value)
                return;

            var keepsAdminRole = requestedRoleId == adminRoleId.Value;
            if (keepsAdminRole && requestedStatus)
                return;

            var hasAnotherActiveAdmin = await _db.Users
                .AnyAsync(x => x.UserId != user.UserId && x.RoleId == adminRoleId.Value && x.Status, ct);

            if (!hasAnotherActiveAdmin)
                throw new ArgumentException("Hệ thống phải luôn có ít nhất một tài khoản Admin đang hoạt động.");
        }



        public async Task<bool> UpdateAsync(int userId, UpdateUserRequest request, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null) return false;

            var roleExists = await _db.Roles.AnyAsync(x => x.RoleId == request.RoleId, ct);
            if (!roleExists)
                throw new ArgumentException("Role không tồn tại.");

            await EnsureCannotAssignAdminRoleAsync(user, request.RoleId, ct);
            await EnsureActiveAdminStillExistsAsync(user, request.RoleId, request.Status, ct);

            var normalizedPhoneNumber = request.PhoneNumber?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedPhoneNumber))
            {
                if (normalizedPhoneNumber.Length > 20)
                    throw new ArgumentException("Số điện thoại không được vượt quá 20 ký tự.");

                var phoneNumberExists = await _db.Users.AnyAsync(
                    x => x.PhoneNumber == normalizedPhoneNumber && x.UserId != userId,
                    ct);

                if (phoneNumberExists)
                    throw new ArgumentException("Số điện thoại đã tồn tại.");
            }

            var normalizedEmail = request.Email?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedEmail))
            {
                var emailExists = await _db.Users.AnyAsync(x => x.Email == normalizedEmail && x.UserId != userId, ct);
                if (emailExists)
                    throw new ArgumentException("Email đã tồn tại.");
            }

            user.RoleId = request.RoleId;
            user.FullName = request.FullName.Trim();
            user.Email = normalizedEmail;
            user.PhoneNumber = normalizedPhoneNumber;
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

            await EnsureActiveAdminStillExistsAsync(user, user.RoleId, status, ct);

            user.Status = status;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> ChangeRoleAsync(int userId, int roleId, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null) return false;

            var roleExists = await _db.Roles.AnyAsync(x => x.RoleId == roleId, ct);
            if (!roleExists)
                throw new ArgumentException("Role không tồn tại.");

            await EnsureCannotAssignAdminRoleAsync(user, roleId, ct);
            await EnsureActiveAdminStillExistsAsync(user, roleId, user.Status, ct);

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

        public async Task<bool> UpdateRoleAsync(int roleId, UpdateRoleRequest request, CancellationToken ct)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(x => x.RoleId == roleId, ct);
            if (role == null) return false;

            var roleName = request.RoleName?.Trim();
            if (string.IsNullOrWhiteSpace(roleName))
                throw new ArgumentException("Tên role không được để trống.");

            var exists = await _db.Roles.AnyAsync(
                x => x.RoleName == roleName && x.RoleId != roleId, ct);

            if (exists)
                throw new ArgumentException("Tên role đã tồn tại.");

            role.RoleName = roleName;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteRoleAsync(int roleId, CancellationToken ct)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(x => x.RoleId == roleId, ct);
            if (role == null) return false;

            var isUsed = await _db.Users.AnyAsync(x => x.RoleId == roleId, ct);
            if (isUsed)
                throw new ArgumentException("Không thể xóa role vì đang có user sử dụng.");

            _db.Roles.Remove(role);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<RoleDto> CreateRoleAsync(CreateRoleRequest request, CancellationToken ct)
        {
            var roleName = request.RoleName?.Trim();
            if (string.IsNullOrWhiteSpace(roleName))
                throw new ArgumentException("Tên role không được để trống.");

            var exists = await _db.Roles.AnyAsync(x => x.RoleName == roleName, ct);
            if (exists)
                throw new ArgumentException("Tên role đã tồn tại.");

            var role = new Role
            {
                RoleName = roleName
            };

            _db.Roles.Add(role);
            await _db.SaveChangesAsync(ct);

            return new RoleDto
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName
            };
        }
    }
}
