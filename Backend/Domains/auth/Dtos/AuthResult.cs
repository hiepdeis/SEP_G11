namespace Backend.Domains.auth.Dtos
{
    public class AuthResult
    {
        public string accessToken { get; set; } = null!;
        public RefreshTokenResult RefreshTokenResult { get; set; } = null!;
    }
}
