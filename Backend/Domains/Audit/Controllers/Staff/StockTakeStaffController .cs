using System.Security.Claims;
using Backend.Domains.Audit.DTOs;
using Backend.Domains.Audit.DTOs.Staff;
using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Staff;

[ApiController]
[Route("api/stocktakes/staff")]
public class StockTakeStaffController : ControllerBase
{
    private readonly IStockTakeService _service;
    public StockTakeStaffController(IStockTakeService service) => _service = service;

    // Staff xem list hàng cần đếm theo warehouse được giao
    [HttpGet("warehouses/{warehouseId:int}/details")]
    //[Authorize]
    public async Task<ActionResult<ActiveAuditDetailsResponse>> GetCountingListByWarehouse([FromRoute] int warehouseId, CancellationToken ct)
    {
        var userId = GetCurrentUserIdFixedOrToken();
        var result = await _service.GetCountingListByWarehouseAsync(userId, warehouseId, ct);
        return Ok(result);
    }

    // Staff nhập số đếm cho 1 dòng (id = StockTakeDetails.ID)
    [HttpPut("active/details/{id:long}/count")]
    //[Authorize]
    public async Task<ActionResult<CountDetailResponse>> Count([FromRoute] long id, [FromBody] CountDetailRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserIdFixedOrToken();
        var result = await _service.CountActiveAuditDetailAsync(userId, id, request, ct);
        return Ok(result);
    }

    private int GetCurrentUserIdFixedOrToken()
    {
        // Nếu bạn đang cố định userId để test staff, bật dòng dưới:
        // return 4;

        //var raw =
        //    User.FindFirstValue(ClaimTypes.NameIdentifier)
        //    ?? User.FindFirstValue("UserID")
        //    ?? User.FindFirstValue("UserId")
        //    ?? User.FindFirstValue("userId")
        //    ?? User.FindFirstValue("id")
        //    ?? User.FindFirstValue("sub");

        //if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
        //    throw new UnauthorizedAccessException("Cannot determine current user id from token.");

        //return userId;
        return 1;

    }
}
