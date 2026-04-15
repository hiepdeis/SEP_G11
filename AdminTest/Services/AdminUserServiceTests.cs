using AdminTest.TestHelpers;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Services;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace AdminTest.Services;

public class AdminUserServiceTests
{
    [Test]
    public void ChangeStatusAsync_RejectsSelfDeactivation()
    {
        using var db = TestDbContextFactory.Create();
        var service = new AdminUserService(db);

        var ex = Assert.ThrowsAsync<ArgumentException>(async () =>
            await service.ChangeStatusAsync(7, false, 7, CancellationToken.None));

        Assert.That(ex!.Message, Does.Contain("Bạn không thể tự khóa chính mình"));
    }

    [Test]
    public void ChangeRoleAsync_RejectsDemotingLastActiveAdmin()
    {
        using var db = TestDbContextFactory.Create();
        SeedRoles(db);
        db.Users.Add(new User
        {
            UserId = 1,
            Username = "admin",
            PasswordHash = "hash",
            RoleId = 1,
            FullName = "Main Admin",
            Status = true
        });
        db.SaveChanges();

        var service = new AdminUserService(db);

        var ex = Assert.ThrowsAsync<ArgumentException>(async () =>
            await service.ChangeRoleAsync(1, 2, 99, CancellationToken.None));

        Assert.That(ex!.Message, Does.Contain("ít nhất một tài khoản Admin đang hoạt động"));
    }

    [Test]
    public async Task UpdateAsync_UpdatesUserAndQueuesNotifications()
    {
        using var db = TestDbContextFactory.Create();
        SeedRoles(db);
        db.Roles.Add(new Role
        {
            RoleId = 3,
            RoleName = "Manager"
        });
        db.Users.AddRange(
            new User
            {
                UserId = 10,
                Username = "super-admin",
                PasswordHash = "hash",
                RoleId = 1,
                FullName = "Super Admin",
                Email = "admin@example.com",
                Status = true
            },
            new User
            {
                UserId = 20,
                Username = "staff-user",
                PasswordHash = "hash",
                RoleId = 2,
                FullName = "Old Name",
                Email = "old@example.com",
                PhoneNumber = "000",
                Status = true
            });
        await db.SaveChangesAsync();

        var service = new AdminUserService(db);

        var updated = await service.UpdateAsync(
            20,
            new UpdateUserRequest
            {
                RoleId = 3,
                FullName = "Updated User",
                Email = " updated@example.com ",
                PhoneNumber = " 0901234567 ",
                Status = false
            },
            currentAdminUserId: 10,
            ct: CancellationToken.None);

        var user = await db.Users.SingleAsync(x => x.UserId == 20);
        var notifications = await db.Notifications
            .OrderBy(x => x.UserId)
            .ToListAsync();

        Assert.Multiple(() =>
        {
            Assert.That(updated, Is.True);
            Assert.That(user.RoleId, Is.EqualTo(3));
            Assert.That(user.FullName, Is.EqualTo("Updated User"));
            Assert.That(user.Email, Is.EqualTo("updated@example.com"));
            Assert.That(user.PhoneNumber, Is.EqualTo("0901234567"));
            Assert.That(user.Status, Is.False);
            Assert.That(notifications, Has.Count.EqualTo(2));
            Assert.That(notifications.Single(x => x.UserId == 20).Message, Does.Contain("Super Admin"));
            Assert.That(notifications.Single(x => x.UserId == 20).Message, Does.Contain("Manager"));
            Assert.That(notifications.Single(x => x.UserId == 20).Message, Does.Contain("đã bị vô hiệu hóa"));
            Assert.That(notifications.Single(x => x.UserId == 10).Message, Does.Contain("Updated User"));
        });
    }

    [Test]
    public async Task GetUsersAsync_ExcludesAdminAccountsAndAppliesFilters()
    {
        using var db = TestDbContextFactory.Create();
        SeedRoles(db);
        db.Users.AddRange(
            new User
            {
                UserId = 1,
                Username = "admin",
                PasswordHash = "hash",
                RoleId = 1,
                FullName = "Admin User",
                Email = "admin@example.com",
                Status = true
            },
            new User
            {
                UserId = 2,
                Username = "anna",
                PasswordHash = "hash",
                RoleId = 2,
                FullName = "Anna Nguyen",
                Email = "anna@example.com",
                Status = true
            },
            new User
            {
                UserId = 3,
                Username = "andrew",
                PasswordHash = "hash",
                RoleId = 2,
                FullName = "Andrew Tran",
                Email = "andrew@example.com",
                Status = false
            });
        await db.SaveChangesAsync();

        var service = new AdminUserService(db);

        var result = await service.GetUsersAsync(
            new GetUsersQuery
            {
                Search = "ann",
                Status = true,
                Page = 1,
                PageSize = 10
            },
            CancellationToken.None);

        Assert.Multiple(() =>
        {
            Assert.That(result.TotalItems, Is.EqualTo(1));
            Assert.That(result.Items.Select(x => x.Username), Is.EqualTo(new[] { "anna" }));
            Assert.That(result.Items.Any(x => x.RoleName == "Admin"), Is.False);
        });
    }

    private static void SeedRoles(Backend.Data.MyDbContext db)
    {
        db.Roles.AddRange(
            new Role
            {
                RoleId = 1,
                RoleName = "Admin"
            },
            new Role
            {
                RoleId = 2,
                RoleName = "Staff"
            });
    }
}
