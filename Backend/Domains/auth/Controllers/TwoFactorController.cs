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


        private async Task<User?> GetCurrentUserAsync()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken)) return null;
            return await _authService.GetUserByRefreshTokenAsync(refreshToken);
        }

        /// <summary>
        /// API MỚI: FE gọi hàm này đầu tiên khi vào trang Cài đặt 
        /// để biết nên hiện nút "Tạo mới", "Tiếp tục tạo" hay "Đã bật"
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var userFromDb = await GetCurrentUserAsync();
            if (userFromDb == null) return Unauthorized();

            var totpRecord = await _context.TotpUsers
                .FirstOrDefaultAsync(x => x.UserId == userFromDb.UserId);

            if (totpRecord == null)
            {
                return Ok(new { isEnabled = false, isPending = false, message = "Chưa thiết lập 2FA." });
            }

            return Ok(new
            {
                isEnabled = totpRecord.IsEnabled,
                isPending = !totpRecord.IsEnabled, // Có record nhưng IsEnabled = false nghĩa là đang dở dang
                setupAt = totpRecord.SetupAt,
                verifiedAt = totpRecord.VerifiedAt
            });
        }

        /// <summary>
        /// API 1: Khởi tạo quá trình cài đặt 2FA
        /// Phương thức: POST /api/TwoFactorAuth/setup
        /// </summary>
        [HttpPost("setup")]
        public async Task<IActionResult> Setup2FA()
        {
            var userFromDb = await GetCurrentUserAsync();

            if (userFromDb == null) return Unauthorized();

            var totpRecord = await _context.TotpUsers
                            .FirstOrDefaultAsync(x => x.UserId == userFromDb.UserId);

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
                    CreatedAt = DateTime.UtcNow,
                    SetupAt = DateTime.UtcNow
                };
                _context.TotpUsers.Add(totpRecord);
            }
            else
            {
                totpRecord.SecretKey = secretKeyString;
                totpRecord.SetupAt = DateTime.UtcNow;
                totpRecord.FailedAttempts = 0;
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
            var userFromDb = await GetCurrentUserAsync();
            if (userFromDb == null) return Unauthorized();

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


        /// <summary>
        /// API 3: Xác thực mã OTP cho các tác vụ quan trọng (Ký duyệt, Đăng nhập...)
        /// Phương thức: POST /api/TwoFactor/verify-action
        /// </summary>
        [HttpPost("verify-action")]
        public async Task<IActionResult> VerifyAction([FromBody] VerifySetupRequestDto request)
        {
            var userFromDb = await GetCurrentUserAsync();
            if (userFromDb == null) return Unauthorized();

            var totpRecord = await _context.TotpUsers.FirstOrDefaultAsync(t => t.UserId == userFromDb.UserId);

            // Kiểm tra xem user đã thực sự bật 2FA chưa. Nếu chưa bật mà đòi xác thực thì chặn ngay.
            if (totpRecord == null || !totpRecord.IsEnabled)
            {
                return BadRequest(new { message = "Tài khoản chưa bật tính năng xác thực 2 lớp." });
            }

            try
            {
                var secretBytes = Base32Encoding.ToBytes(totpRecord.SecretKey);
                var totp = new Totp(secretBytes);

                // Kiểm tra mã OTP
                bool isValid = totp.VerifyTotp(request.OtpCode, out long timeWindowUsed, window: null);

                if (isValid)
                {
                    // (Tuỳ chọn) Nếu trước đó họ nhập sai nhiều lần, giờ nhập đúng thì reset bộ đếm về 0
                    if (totpRecord.FailedAttempts > 0)
                    {
                        totpRecord.FailedAttempts = 0;
                        await _context.SaveChangesAsync();
                    }

                    // Trả về true để Frontend biết mà gọi tiếp API duyệt phiếu
                    return Ok(new { success = true, message = "Xác thực OTP thành công!" });
                }
                else
                {
                    // (Tuỳ chọn nâng cao) Tăng biến đếm số lần nhập sai lên 1 để chống brute-force
                    totpRecord.FailedAttempts += 1;
                    await _context.SaveChangesAsync();

                    return BadRequest(new { message = "Mã OTP không chính xác hoặc đã hết hạn." });
                }
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi kiểm tra mã OTP." });
            }
        }


        public class VerifySetupRequestDto
        {
            public string OtpCode { get; set; } = null!;
        }
    }
}
