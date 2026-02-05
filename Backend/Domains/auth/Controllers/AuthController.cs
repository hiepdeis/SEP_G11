using Backend.Domains.auth.Business;
using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.auth.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IGoogleOAuthService _googleOAuthService;
        private readonly GoogleLoginHandler _googleLoginHandler;

        public AuthController(
            IAuthService authService,
            IGoogleOAuthService googleOAuthService,
            GoogleLoginHandler googleLoginHandler)
        {
            _authService = authService;
            _googleOAuthService = googleOAuthService;
            _googleLoginHandler = googleLoginHandler;
        }

        [HttpGet("login-google")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback([FromQuery] string code)
        {
            try
            {
                if (string.IsNullOrEmpty(code))
                {
                    return BadRequest("Missing authorization code");
                }

                var tokenResponse = await _googleOAuthService.ExchangeCodeForToken(code);
                var googleUser = await _googleOAuthService.GetGoogleUserInfo(tokenResponse.AccessToken);

                var result = await _googleLoginHandler.HandleGoogleLogin(googleUser);

                SetRefreshTokenCookie(result.refreshToken, result.Expiry);

                return Redirect("http://localhost:3000/login-success");
            }
            catch (UnauthorizedAccessException ex)
            {
                return Redirect($"http://localhost:3000/login-error?message={Uri.EscapeDataString(ex.Message)}");
            }
        }

        private void SetRefreshTokenCookie(string refreshToken, DateTime? expires)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Lax,
                Expires = expires ?? DateTime.UtcNow.AddDays(1),
                Path = "/"
            };

            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            try
            {
                var refreshToken = Request.Cookies["refreshToken"];
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return Unauthorized();
                }

                var userFromDb = await _authService.GetUserByRefreshTokenAsync(refreshToken);
                if (userFromDb == null)
                {
                    return Unauthorized();
                }

                var accessToken = await _authService.CreateAccessToken(userFromDb);

                return Ok(new AuthResponse
                {
                    AccessToken = accessToken,
                    Status = userFromDb.Status
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }
    }
}