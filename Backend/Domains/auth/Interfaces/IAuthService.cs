using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Entity;

namespace Backend.Domains.auth.Interfaces
{
    public interface IAuthService
    {
        Task<User?> GetUserByEmailAsync(string email);
        Task<RefreshTokenResult> GenerateAndSaveRefreshToken(User user);
        Task<string> CreateAccessToken(User user);


    }
}
