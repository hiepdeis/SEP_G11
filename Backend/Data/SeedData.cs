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
                        Username = "Admin",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Admin"],
                        FullName = "Phan Long",
                        Email = "hiepdevo@gmail.com",
                        Status = true
                    },
                    new User
                    {
                        Username = "Accountant",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Accountant"],
                        FullName = "Dung Hoang",
                        Email = "trungthanh26148@gmail.com",
                        Status  = true
                    },
                    new User
                    {
                        Username = "warehouse_manager",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["WarehouseManager"],
                        FullName = "Vương Phan",
                        Email = "hieppdhe171309@fpt.edu.vn",
                        Status =true
                    },
                    new User
                    {
                        Username = "construction",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["ConstructionTeam"],
                        FullName = "Phạm Văn Bài",
                        Email = "hieppdhe@gmail.com",
                        Status =true
                    },
                    new User
                    {
                        Username = "staff",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["WarehouseStaff"],
                        FullName = "Phạm Dũng",
                        Email = "phamduyhiep2003@gmail.com",
                        Status =true
                    },
                    new User
                    {
                        Username = "purchasing",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        RoleId = roleDict["Purchasing"],
                        FullName = "Trần Mai Anh",
                        Email = "hiepphamdell@gmail.com",
                        Status =true

                    }
                };

                context.Users.AddRange(users);
                await context.SaveChangesAsync();
            }
        }
    }
}
