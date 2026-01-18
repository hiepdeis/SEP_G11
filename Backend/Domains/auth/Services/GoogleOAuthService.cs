using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Interfaces;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks; 

namespace Backend.Domains.auth.Services
{
    public class GoogleOAuthService : IGoogleOAuthService
    {
        private readonly IConfiguration _config;
        public GoogleOAuthService(IConfiguration config)
        {
            _config = config;
        }
        public async Task<GoogleTokenResponse> ExchangeCodeForToken(string code)
        {
            using var client = new HttpClient();

            var values = new Dictionary<string, string>
            {
                { "code", code },
                { "client_id", _config["Google:ClientId"] },
                { "client_secret", _config["Google:ClientSecret"] },
                { "redirect_uri", _config["Google:RedirectUri"] },
                { "grant_type", "authorization_code" }
            };

            var response = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(values));

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<GoogleTokenResponse>(json)!;
        }

        public async Task<GoogleUserInfo> GetGoogleUserInfo (string accessToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync(
                "https://www.googleapis.com/oauth2/v2/userinfo"
            );
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception("Google userinfo error: " + body);

            return JsonSerializer.Deserialize<GoogleUserInfo>(body)!;
        }
    }
}
