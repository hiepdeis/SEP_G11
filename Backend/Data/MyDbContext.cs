using Backend.Domains.auth.Entity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class MyDbContext : DbContext
    {
        public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                 .HasIndex(u => u.Email)
                 .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.RefreshToken)
                .IsUnique();

            modelBuilder.Entity<Role>().HasData(
                  new Role { Id = 1, Name = "ADMIN" },
                  new Role { Id = 2, Name = "MANAGER" },
                  new Role { Id = 3, Name = "WORKER" }
              );
        }
    }
}
