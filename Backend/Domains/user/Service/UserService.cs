using Backend.Data;
using Backend.Domains.auth.Entity;
using Backend.Domains.user.Dtos;
using Backend.Domains.user.Interface;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.user.Service
{
    public class UserService : IUserService
    {
        private readonly MyDbContext _context;

        public UserService(MyDbContext context)
        {
            _context = context;
        }
        public async Task<UserDto?> ActiveUserAsync(int userId)
        {   
            var user = await _context.Users.Include(i => i.Role)
                       .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

            if (user.Status == true) throw new InvalidOperationException($"User with ID {userId} is already active.");

            user.Status = true;
            await _context.SaveChangesAsync();
            return MapToUserDto(user);
        }

        public async Task<UserDto?> DeactiveUserAsync(int userId)
        {
            var user = await _context.Users.Include(i => i.Role)
                       .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

            if (user.Status == false) throw new InvalidOperationException($"User with ID {userId} is already inactive.");

            user.Status = false;
            await _context.SaveChangesAsync();
            return MapToUserDto(user);
        }

        public async Task<IEnumerable<UserDto?>> GetAllUserAsync()
        {
            var users = await _context.Users.Include(i => i.Role).ToListAsync();
            return users.Select(MapToUserDto).ToList();
        }

        public async Task<UserDto?> GetUserProfileAsync(int userId)
        {
            var user = await _context.Users.Include(i => i.Role)
                       .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

            return MapToUserDto(user);
        }

        public async Task<UserDto?> UpdateUserProfileAsync(int userId, UserDto userDto)
        {
            var user = await _context.Users.Include(i => i.Role)
                       .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

            user.FullName = userDto.FullName;
            user.PhoneNumber = userDto.PhoneNumber;
            await _context.SaveChangesAsync();
            return MapToUserDto(user);
        }

        private UserDto MapToUserDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                RoleName = user.Role.Name,
                PhoneNumber = user.PhoneNumber,
                Status = user.Status
            };
        }
    }
}