using Backend.Data;
using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Entity;
using Backend.Domains.auth.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;


namespace Backend.Domains.auth.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly MyDbContext _context;

        public AuthService(IConfiguration configuration, MyDbContext context)
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

        public async Task<string> CreateAccessToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, user.Email ),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role.Name ) // Use Role.Name instead of Role
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
            var refreshToken = $"{user.Id}.{Guid.NewGuid()}";

            user.RefreshToken = refreshToken;
            // user.RefreshToken = BCrypt.Net.BCrypt.HashPassword(refreshToken);
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
                _configuration.GetValue<int>("Jwt:RefreshTokenDays")
            );

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return new RefreshTokenResult { 
                refreshToken = refreshToken,
                Expiry = user.RefreshTokenExpiry
            }; 
        }

    }
}
