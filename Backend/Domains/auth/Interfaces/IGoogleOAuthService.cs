using Backend.Domains.auth.Dtos;


namespace Backend.Domains.auth.Interfaces
{
    public interface IGoogleOAuthService
    {
        Task<GoogleTokenResponse> ExchangeCodeForToken(string code);

        Task<GoogleUserInfo> GetGoogleUserInfo(string accessToken);
    }
}
