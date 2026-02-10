
﻿//using Backend.Data;
//using Backend.Domains.auth.Entity;
//using Backend.Domains.user.Dtos;
//using Backend.Domains.user.Interface;
//using Microsoft.EntityFrameworkCore;

//namespace Backend.Domains.user.Service
//{
//    public class UserService : IUserService
//    {
//        private readonly MyDbContext _context;

//        public UserService(MyDbContext context)
//        {
//            _context = context;
//        }

//        public async Task<UserDto?> GetUserProfileAsync(int userId)
//        {
//            var user = await _context.Users.Include(i => i.Role)
//                       .FirstOrDefaultAsync(u => u.Id == userId);
﻿using Backend.Domains.user.Dtos;
using Backend.Domains.user.Interface;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.user.Service
{
    public class UserService : IUserService
    {
        private readonly CapstoneSemester9Context _context;

        public UserService(CapstoneSemester9Context context)
        {
            _context = context;
        }

        public async Task<UserDto?> GetUserProfileAsync(int userId)
        {
            var user = await _context.Users.Include(i => i.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);


//            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

//            return MapToUserDto(user);
//        }


//        public async Task<PaginatedUsersDto> GetAllUsersAsync(int pageIndex = 1, int pageSize = 10)
//        {
//            // Validate pagination parameters
//            if (pageIndex < 1) pageIndex = 1;
//            if (pageSize < 1) pageSize = 10;
//            if (pageSize > 100) pageSize = 100; // Limit max page size

        public async Task<PaginatedUsersDto> GetAllUsersAsync(int pageIndex = 1, int pageSize = 10)
        {
            if (pageIndex < 1) pageIndex = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;


//            var totalCount = await _context.Users.CountAsync();

//            var users = await _context.Users
//                .Include(i => i.Role)
//                .Skip((pageIndex - 1) * pageSize)
//                .Take(pageSize)
//                .ToListAsync();

//            return new PaginatedUsersDto
//            {
//                Users = users.Select(MapToUserDto),
//                TotalCount = totalCount,
//                PageIndex = pageIndex,
//                PageSize = pageSize
//            };
//        }


//        public async Task<UserDto?> UpdateUserProfileAsync(int userId, UserProfileUpdateDto userDto)
//        {
//            var user = await _context.Users.Include(i => i.Role)
//                       .FirstOrDefaultAsync(u => u.Id == userId);

        public async Task<UserDto?> UpdateUserProfileAsync(int userId, UserProfileUpdateDto userDto)
        {
            var user = await _context.Users.Include(i => i.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);


//            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

//            user.FullName = userDto.FullName;
//            user.PhoneNumber = userDto.PhoneNumber;

//            await _context.SaveChangesAsync();
//            return MapToUserDto(user);
//        }


//        public async Task<UserDto?> UpdateUserStatusAsync(int userId, bool isActive)
//        {
//            var user = await _context.Users.Include(i => i.Role)
//                       .FirstOrDefaultAsync(u => u.Id == userId);

        public async Task<UserDto?> UpdateUserStatusAsync(int userId, bool isActive)
        {
            var user = await _context.Users.Include(i => i.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);


//            if (user == null) throw new ArgumentException($"User with ID {userId} not found.");

//            if (user.Status == isActive)
//            {
//                var statusText = isActive ? "active" : "inactive";
//                throw new InvalidOperationException($"User with ID {userId} is already {statusText}.");
//            }

//            user.Status = isActive;
//            await _context.SaveChangesAsync();
//            return MapToUserDto(user);
//        }


//        private UserDto MapToUserDto(User user)
//        {
//            return new UserDto
//            {
//                Id = user.Id,
//                Email = user.Email,
//                FullName = user.FullName,
//                RoleName = user.Role.Name,
//                PhoneNumber = user.PhoneNumber,
//                Status = user.Status
//            };
//        }
//    }
//}

        private UserDto MapToUserDto(User user)
        {
            return new UserDto
            {
                Id = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                RoleName = user.Role.RoleName,
                PhoneNumber = user.PhoneNumber,
                Status = user.Status
            };
        }
    }
}

