namespace Backend.Domains.auth.Dtos
{
    public class AuthResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public bool Status { get; set; }
    }
}
