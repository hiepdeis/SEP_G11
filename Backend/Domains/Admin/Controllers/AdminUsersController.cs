using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Domains.Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    //[Authorize(Roles = "Admin")]
    public sealed class AdminUsersController : ControllerBase
    {
        private readonly IAdminUserService _svc;

        public AdminUsersController(IAdminUserService svc)
        {
            _svc = svc;
        }

        private int GetCurrentUserId()
        {
            var claim = User.Claims.FirstOrDefault(x => x.Type == "userId")?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] GetUsersQuery query, CancellationToken ct)
        {
            var result = await _svc.GetUsersAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            var user = await _svc.GetByIdAsync(id, ct);
            if (user == null) return NotFound(new { message = "User không tồn tại." });
            return Ok(user);
        }



        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken ct)
        {
            var ok = await _svc.UpdateAsync(id, request, ct);
            if (!ok) return NotFound(new { message = "User không tồn tại." });
            return Ok(new { message = "Cập nhật người dùng thành công." });
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> ChangeStatus(int id, [FromBody] ChangeUserStatusRequest request, CancellationToken ct)
        {
            var ok = await _svc.ChangeStatusAsync(id, request.Status, GetCurrentUserId(), ct);
            if (!ok) return NotFound(new { message = "User không tồn tại." });
            return Ok(new { message = request.Status ? "Kích hoạt người dùng thành công." : "Ngừng hoạt động người dùng thành công." });
        }

        [HttpPatch("{id:int}/role")]
        public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeUserRoleRequest request, CancellationToken ct)
        {
            var ok = await _svc.ChangeRoleAsync(id, request.RoleId, ct);
            if (!ok) return NotFound(new { message = "User không tồn tại." });
            return Ok(new { message = "Đổi vai trò thành công." });
        }
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles(CancellationToken ct)
        {
            var roles = await _svc.GetRolesAsync(ct);
            return Ok(roles);
        }

        [HttpPut("roles/{roleId:int}")]
        public async Task<IActionResult> UpdateRole(int roleId, UpdateRoleRequest request, CancellationToken ct)
        {
            var ok = await _svc.UpdateRoleAsync(roleId, request, ct);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpDelete("roles/{roleId:int}")]
        public async Task<IActionResult> DeleteRole(int roleId, CancellationToken ct)
        {
            var ok = await _svc.DeleteRoleAsync(roleId, ct);
            if (!ok) return NotFound();
            return NoContent();
        }
        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole(CreateRoleRequest request, CancellationToken ct)
        {
            var result = await _svc.CreateRoleAsync(request, ct);
            return Ok(result);
        }

    }
}