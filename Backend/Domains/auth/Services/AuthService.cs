using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Interfaces;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Domains.auth.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly CapstoneSemester9Context _context;

        public AuthService(IConfiguration configuration, CapstoneSemester9Context context)
        {
            _configuration = configuration;
            _context = context;
        }

        public async Task<User?> GetUserByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<User?> GetUserByRefreshTokenAsync(string refreshToken)
        {
            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.RefreshToken == refreshToken &&
                    u.RefreshTokenExpiry != null &&
                    u.RefreshTokenExpiry > DateTime.UtcNow);
        }

        public async Task<string> CreateAccessToken(User user)
        {
            if (!user.Status)
            {
                throw new UnauthorizedAccessException("User is deactivated.");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Role, user.Role.RoleName),
                new Claim("Status", user.Status.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetValue<string>("Jwt:Key")!
            ));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            int expiresInMinutes = _configuration.GetValue<int>("Jwt:ExpiresInMinutes", 30);

            var tokenDistributer = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(tokenDistributer);
        }

        public async Task<RefreshTokenResult> GenerateAndSaveRefreshToken(User user)
        {
            var refreshToken = $"{user.UserId}.{Guid.NewGuid()}";

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
                _configuration.GetValue<int>("Jwt:RefreshTokenDays")
            );

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return new RefreshTokenResult
            {
                refreshToken = refreshToken,
                Expiry = user.RefreshTokenExpiry ?? DateTime.MinValue
            };
        }
    }
}