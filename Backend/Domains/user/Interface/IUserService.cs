using Backend.Domains.user.Dtos;

namespace Backend.Domains.user.Interface
{
    public interface IUserService
    {
        Task<UserDto?> GetUserProfileAsync(int userId);
        Task<PaginatedUsersDto> GetAllUsersAsync(int pageIndex = 1, int pageSize = 10);
        Task<UserDto?> UpdateUserProfileAsync(int userId, UserProfileUpdateDto userDto);
        Task<UserDto?> UpdateUserStatusAsync(int userId, bool isActive);
    }
}