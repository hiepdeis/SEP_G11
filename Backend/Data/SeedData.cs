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
                new Role { RoleName = "Accountant" },
                new Role { RoleName = "WarehouseManager" },
                new Role { RoleName = "ConstructionTeam" },
                new Role { RoleName = "WarehouseStaff" },
                new Role { RoleName = "Purchasing" }
            };

                context.Roles.AddRange(roles);
                await context.SaveChangesAsync();
            }

            // ===== 2. Seed Users =====
            if (!await context.Users.AnyAsync())
            {
                var roleDict = await context.Roles
                    .ToDictionaryAsync(r => r.RoleName, r => r.RoleId);

                var users = new List<User>
                {
                    new User
                    {
                        Username = "admin",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Admin"],
                        FullName = "System Admin",
                        Email = "admin@system.local"
                    },
                    new User
                    {
                        Username = "accountant",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Accountant"],
                        FullName = "Accountant"
                    },
                    new User
                    {
                        Username = "warehouse_manager",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["WarehouseManager"],
                        FullName = "Warehouse Manager"
                    },
                    new User
                    {
                        Username = "construction",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["ConstructionTeam"],
                        FullName = "Construction Team"
                    },
                    new User
                    {
                        Username = "staff",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["WarehouseStaff"],
                        FullName = "Warehouse Staff"
                    },
                    new User
                    {
                        Username = "purchasing",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Purchasing"],
                        FullName = "Purchasing Staff"
                    }
                };

                context.Users.AddRange(users);
                await context.SaveChangesAsync();
            }
        }
    }
}
