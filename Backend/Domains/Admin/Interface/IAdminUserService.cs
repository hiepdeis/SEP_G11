using Backend.Domains.Admin.Dtos;

namespace Backend.Domains.Admin.Interface
{
    public interface IAdminUserService
    {
        Task<PagedResult<UserListItemDto>> GetUsersAsync(GetUsersQuery query, CancellationToken ct);
        Task<UserListItemDto?> GetByIdAsync(int userId, CancellationToken ct);
        Task<List<RoleDto>> GetRolesAsync(CancellationToken ct);
        Task<bool> UpdateAsync(int userId, UpdateUserRequest request, CancellationToken ct);
        Task<bool> ChangeStatusAsync(int userId, bool status, int currentUserId, CancellationToken ct);
        Task<bool> ChangeRoleAsync(int userId, int roleId, CancellationToken ct);
    }
}
