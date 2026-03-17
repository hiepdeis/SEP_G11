namespace Backend.Domains.auth.Dtos
{
    public class AuthResponse
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string AccessToken { get; set; } = string.Empty;
        public bool Status { get; set; }
        
        public string RoleName { get; set; } = string.Empty;
    }
}
