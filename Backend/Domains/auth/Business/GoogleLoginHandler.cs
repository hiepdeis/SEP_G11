//using Backend.Data;
//using Backend.Domains.auth.Dtos;
//using Backend.Domains.auth.Entity;
//using Backend.Domains.auth.Interfaces;
//using Microsoft.EntityFrameworkCore;

//namespace Backend.Domains.auth.Business
//{

//    public class GoogleLoginHandler
//    {
//        private readonly MyDbContext _context;
//        private readonly IAuthService _authService;
//        public GoogleLoginHandler(MyDbContext context, IAuthService authService)
//        {
//            _context = context;
//            _authService = authService;
//        }

//        public async Task<RefreshTokenResult> HandleGoogleLogin(GoogleUserInfo googleUser)
//        {

//            var user = await _context.Users
//                .FirstOrDefaultAsync(u => u.Email == googleUser.Email);

//            if (user == null)
//            {
//                user = new User
//                {
//                    Email = googleUser.Email,
//                    FullName = googleUser.Name,
//                    RoleId = 3,
//                    Status = true
//                };
//                _context.Users.Add(user);
//                await _context.SaveChangesAsync();
//            }
//            else
//            {
//                if (!user.Status)
//                {
//                    throw new UnauthorizedAccessException("User is deactivated.");
//                }
//            }

//                var userFromDb = await _authService.GetUserByEmailAsync(user.Email)!;

//            //var accessToken = await _authService.CreateAccessToken(userFromDb);
//            var refreshToken = await _authService.GenerateAndSaveRefreshToken(userFromDb);
//            return refreshToken;
//            //return new AuthResult
//            //{
//            //    accessToken = accessToken,
//            //    RefreshTokenResult = refreshToken
//            //};
//        }

//    }
//}
