using Backend.Data;
using Backend.Domains.auth.Interfaces;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtpNet; 
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Domains.auth.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TwoFactorController : ControllerBase
    {

        private readonly MyDbContext _context; 
        private readonly IAuthService _authService;
        private const string Issuer = "MatCost";

        public TwoFactorController(MyDbContext context, IAuthService authService)
        {
            _context = context;
            _authService = authService;
        }

        /// <summary>
        /// API 1: Khởi tạo quá trình cài đặt 2FA
        /// Phương thức: POST /api/TwoFactorAuth/setup
        /// </summary>
        [HttpPost("setup")]
        public async Task<IActionResult> Setup2FA()
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

            var totpRecord = userFromDb.TotpUser;

            if (totpRecord != null && totpRecord.IsEnabled)
            {
                return BadRequest(new { message = "Tài khoản này đã được bật xác thực 2 lớp." });
            }

         
            var secretKeyBytes = KeyGeneration.GenerateRandomKey(20);
            var secretKeyString = Base32Encoding.ToString(secretKeyBytes);

            if (totpRecord == null)
            {
                totpRecord = new TotpUser
                {
                    UserId = userFromDb.UserId,
                    SecretKey = secretKeyString,
                    IsEnabled = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TotpUsers.Add(totpRecord);
            }
            else
            {
                totpRecord.SecretKey = secretKeyString; // Cấp lại mã mới nếu họ request lại
                totpRecord.CreatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            string qrUri = $"otpauth://totp/{Issuer}:{userFromDb.Username}?secret={secretKeyString}&issuer={Issuer}";

            return Ok(new
            {
                secret = secretKeyString,
                qrUri = qrUri,
                message = "Vui lòng quét mã QR và nhập 6 số xác nhận."
            });
        }

        /// <summary>
        /// API 2: Xác nhận mã OTP để chính thức bật 2FA
        /// Phương thức: POST /api/TwoFactorAuth/verify-setup
        /// </summary>
        [HttpPost("verify-setup")]
        public async Task<IActionResult> VerifySetup([FromBody] VerifySetupRequestDto request)
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

            var totpRecord = await _context.TotpUsers.FirstOrDefaultAsync(t => t.UserId == userFromDb.UserId);

            if (totpRecord == null)
                return BadRequest(new { message = "Vui lòng gọi API setup trước khi xác nhận." });

            if (totpRecord.IsEnabled)
                return BadRequest(new { message = "Xác thực 2 lớp đã được bật từ trước." });

            try
            {
                // Chuyển SecretKey từ DB thành bytes để đưa vào thuật toán
                var secretBytes = Base32Encoding.ToBytes(totpRecord.SecretKey);
                var totp = new Totp(secretBytes);

                // Xác thực mã 6 số người dùng gửi lên
                bool isValid = totp.VerifyTotp(request.OtpCode, out long timeWindowUsed, window: null);

                if (isValid)
                {
                    // Cập nhật trạng thái thành Đã Bật
                    totpRecord.IsEnabled = true;
                    totpRecord.VerifiedAt = DateTime.UtcNow;
                    // Optional: Bạn có thể viết thêm hàm sinh BackupCodes ở đây để lưu vào cột BackupCodes

                    await _context.SaveChangesAsync();

                    return Ok(new { message = "Bật xác thực 2 lớp thành công!" });
                }
                else
                {
                    return BadRequest(new { message = "Mã OTP không hợp lệ hoặc đã hết hạn." });
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi kiểm tra mã OTP." });
            }
        }

        public class VerifySetupRequestDto
        {
            public int UserId { get; set; }
            public string OtpCode { get; set; } = null!;
        }
    }
}
