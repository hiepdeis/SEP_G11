using Backend.Domains.user.Dtos;

namespace Backend.Domains.user.Interface
{
    public interface IUserService
    {
        Task<UserDto?> ActiveUserAsync(int userId);
        Task<UserDto?> DeactiveUserAsync(int userId);
        Task<UserDto?> GetUserProfileAsync(int userId);
        Task<IEnumerable<UserDto?>> GetAllUserAsync();
        Task<UserDto?> UpdateUserProfileAsync(int userId, UserDto userDto);
    }
}
