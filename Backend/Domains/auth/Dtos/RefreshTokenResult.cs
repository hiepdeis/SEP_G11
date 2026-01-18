namespace Backend.Domains.auth.Dtos
{
    public class RefreshTokenResult
    {
        public string refreshToken { get; set; } = null!;
        public DateTime Expiry { get; set; }
    }
}
