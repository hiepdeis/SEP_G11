using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace Backend.Data
{
    public class SeedData
    {
        public static async Task InitializeAsync(MyDbContext context)
        {
            // Ensure DB exists
            await context.Database.EnsureCreatedAsync();

            // ===== 1. Seed Roles =====
            if (!await context.Roles.AnyAsync())
            {
                var roles = new List<Role>
            {
                new Role { RoleName = "Admin" },
                new Role { RoleName = "Manager" },
                new Role { RoleName = "Accountant" },
                new Role { RoleName = "Staff" },
                new Role { RoleName = "Construction" }
            };

                context.Roles.AddRange(roles);
                await context.SaveChangesAsync();
            }

            // ===== 2. Seed Users =====
            if (!await context.Users.AnyAsync())
            {
                int GetRoleId(string roleName) =>
                    context.Roles.First(r => r.RoleName == roleName).RoleId;

                var users = new List<User>
            {
                new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    RoleId = GetRoleId("Admin"),
                    FullName = "System Admin",
                    Email = "admin@system.local"
                },
                new User
                {
                    Username = "manager",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    RoleId = GetRoleId("Manager"),
                    FullName = "Project Manager"
                },
                new User
                {
                    Username = "accountant",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    RoleId = GetRoleId("Accountant"),
                    FullName = "Warehouse Accountant"
                },
                new User
                {
                    Username = "staff",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    RoleId = GetRoleId("Staff"),
                    FullName = "Warehouse Staff"
                },
                new User
                {
                    Username = "construction",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                    RoleId = GetRoleId("Construction"),
                    FullName = "Construction Team"
                }
            };

                context.Users.AddRange(users);
                await context.SaveChangesAsync();
            }
        }
    }
}
