namespace Backend.Domains.user.Dtos
{
    public class UserProfileUpdateDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
    }
}