using Backend.Domains.auth.Dtos;
using Backend.Entities;

namespace Backend.Domains.auth.Interfaces
{
    public interface IAuthService
    {
        Task<User?> GetUserByEmailAsync(string email);
        Task<User?> GetUserByRefreshTokenAsync(string refreshToken);
        Task<RefreshTokenResult> GenerateAndSaveRefreshToken(User user);
        Task<string> CreateAccessToken(User user);

        Task RevokeRefreshTokenAsync(string refreshToken);
    }
}