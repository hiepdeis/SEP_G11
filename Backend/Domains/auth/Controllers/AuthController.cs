
﻿//using Backend.Data;
//using Backend.Domains.auth.Business;
//using Backend.Domains.auth.Dtos;
//using Backend.Domains.auth.Entity;
//using Backend.Domains.auth.Interfaces;
//using Backend.Domains.auth.Services;
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Http;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using System.Net.Http.Headers;
//using System.Net.WebSockets;
//using System.Text.Json;
//using System.Threading.Tasks;


//namespace Backend.Domains.auth.Controllers
//{
//    [Route("api/[controller]")]
//    [ApiController]
//    public class AuthController : ControllerBase
//    {

//        private readonly MyDbContext _context;
//        private readonly IAuthService _authService;
//        private readonly IGoogleOAuthService _googleOAuthService;
//        private readonly IConfiguration _configuration;

//        public AuthController(MyDbContext context, IAuthService authService, IGoogleOAuthService googleOAuthService, IConfiguration configuration)
//        {
//            _context = context;
//            _authService = authService;
//            _googleOAuthService = googleOAuthService;
//            _configuration = configuration;
//        }

//        [HttpGet("login-google")]
//        [AllowAnonymous]
//        public async Task<IActionResult> GoogleCallback([FromQuery] string code)
//        {
//            try
//            {
//                if (string.IsNullOrEmpty(code))
//                    return BadRequest("Missing authorization code");

//                // 1️⃣ Đổi code → access token
//                var tokenResponse = await _googleOAuthService.ExchangeCodeForToken(code);

//                // 2️⃣ Gọi Google lấy user info
//                var googleUser = await _googleOAuthService.GetGoogleUserInfo(tokenResponse.AccessToken);

//                // 3️⃣ Login / register
//                GoogleLoginHandler googleLoginHandler = new GoogleLoginHandler(_context, _authService);
//                var result = await googleLoginHandler.HandleGoogleLogin(googleUser);

//                int expiresDays = _configuration.GetValue<int>("Jwt:RefreshTokenDays");
//                // 4️⃣ Set refresh token cookie
//                SetRefreshTokenCookie(result.refreshToken, result.Expiry);

//                // 5️⃣ Redirect về FE (access token trả qua query hoặc fragment)
//                return Redirect($"http://localhost:3000/login-success");
//            }
//            catch (UnauthorizedAccessException ex)
//            {
//                return Redirect($"http://localhost:3000/login-error?message={Uri.EscapeDataString(ex.Message)}");
//            }
//        }

//        private void SetRefreshTokenCookie(string refreshToken, DateTime? expires)
//        {
//            var cookieOptions = new CookieOptions
//            {
//                HttpOnly = true,          // JS không đọc được
//                Secure = false,            // chỉ gửi qua HTTPS true
//                SameSite = SameSiteMode.Lax, // chống CSRF  Strict 
//                Expires = expires ?? DateTime.UtcNow.AddDays(1),
//                Path = "/"
//            };

﻿using Backend.Domains.auth.Business;
using Backend.Domains.auth.Dtos;
using Backend.Domains.auth.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

        [HttpGet("user-id")]
        [Authorize]
        public IActionResult GetUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userIdClaim))
            {
                return Unauthorized();
            }

            return Ok(new { userId = int.Parse(userIdClaim) });
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


        //        [HttpGet("me")]
        //        public async Task<IActionResult> Me()
        //        {
        //            try
        //            {
        //                var refreshToken = Request.Cookies["refreshToken"];
        //                if (string.IsNullOrEmpty(refreshToken)) return Unauthorized();


        //                var userFromDb = await _context.Users
        //                           .Include(u => u.Role)
        //                           .FirstOrDefaultAsync(u =>
        //                               u.RefreshToken == refreshToken &&
        //                               u.RefreshTokenExpiry > DateTime.UtcNow
        //                           );

        //                if (userFromDb == null) return Unauthorized();

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



