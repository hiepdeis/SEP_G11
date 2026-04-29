using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Accountants
{
    [ApiController]
    [Route("api/accountant/receipts")]
    [Authorize(Roles = "Accountant, Admin", Policy = "ActiveUserOnly")]
    public class ReceiptAccountantController : ControllerBase
    {
        private readonly IReceiptService _service;

        public ReceiptAccountantController(IReceiptService service)
        {
            _service = service;
        }

        private int GetAccountantId()
        {
            return User.GetRequiredUserId();
        }

        [HttpGet]
        public async Task<IActionResult> GetReceipts([FromQuery] string? status)
        {
            try
            {
                var receipts = await _service.GetReceiptsForAccountantAsync(status);
                return Ok(receipts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{receiptId:long}")]
        public async Task<IActionResult> GetReceipt(long receiptId)
        {
            try
            {
                var receipt = await _service.GetReceiptForAccountantAsync(receiptId);
                return Ok(receipt);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("{receiptId:long}/close")]
        public async Task<IActionResult> CloseReceipt(long receiptId, [FromBody] AccountantReceiptCloseDto dto)
        {
            try
            {
                var accountantId = GetAccountantId();
                var result = await _service.CloseReceiptAsync(receiptId, dto, accountantId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
