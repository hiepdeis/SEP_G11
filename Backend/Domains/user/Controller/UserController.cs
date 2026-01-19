using Backend.Domains.user.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.user.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPut("activate/{userId}")]
        public async Task<IActionResult> ActivateUser(int userId)
        {
            try
            {
                var result = await _userService.ActiveUserAsync(userId);
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

        [HttpPut("deactivate/{userId}")]
        public async Task<IActionResult> DeactivateUser(int userId)
        {
            try
            {
                var result = await _userService.DeactiveUserAsync(userId);
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

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var result = await _userService.GetAllUserAsync();
            return Ok(result);
        }

        [HttpPut("update/{userId}")]
        public async Task<IActionResult> UpdateUserProfile(int userId, [FromBody] Dtos.UserDto userDto)
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
    }
}
