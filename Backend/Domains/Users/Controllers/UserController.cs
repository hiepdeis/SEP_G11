using Backend.Domains.user.Interface;
using Backend.Domains.user.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Domains.user.Controller
{
    [Route("api/[controller]")]
    [ApiController]
   // [Authorize(Policy ="ActiveUserOnly")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _userService.GetAllUsersAsync(pageIndex, pageSize);
            return Ok(result);
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserProfile(int userId)
        {
            try
            {
                var result = await _userService.GetUserProfileAsync(userId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateUserProfile(int userId, [FromBody] UserProfileUpdateDto userDto)
        {
            try
            {
                var result = await _userService.UpdateUserProfileAsync(userId, userDto);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPatch("{userId}/status")]
        public async Task<IActionResult> UpdateUserStatus(int userId, [FromBody] UserStatusUpdateDto statusDto)
        {
            try
            {
                var result = await _userService.UpdateUserStatusAsync(userId, statusDto.IsActive);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}