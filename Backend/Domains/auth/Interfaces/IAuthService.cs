using Backend.Domains.auth.Dtos;
using Backend.Models;

namespace Backend.Domains.auth.Interfaces
{
    public interface IAuthService
    {
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByRefreshTokenAsync(string refreshToken);
        Task<RefreshTokenResult> GenerateAndSaveRefreshToken(User user);
        Task<string> CreateAccessToken(User user);
    }
}