using System.Data;

namespace Backend.Domains.auth.Entity
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;

        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        public string? RefreshToken { get; set; }
        public DateTime RefreshTokenExpiry { get; set; }

        public string? PhoneNumber { get; set; }
        public bool Status { get; set; }  // active / inactive
    }
}
