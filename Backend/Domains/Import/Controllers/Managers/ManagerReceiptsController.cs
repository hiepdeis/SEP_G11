using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Managers
{
    [ApiController]
    [Route("api/manager/receipts")]
    public class ManagerReceiptsController : ControllerBase
    {
        private readonly IReceiptService _service;

        public ManagerReceiptsController(IReceiptService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetReceipts([FromQuery] string? status)
        {
            try
            {
                var receipts = await _service.GetReceiptsForManagerAsync(status);
                return Ok(receipts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{receiptId:long}")]
        public async Task<IActionResult> GetReceiptDetail(long receiptId)
        {
            try
            {
                var receipt = await _service.GetReceiptForManagerAsync(receiptId);
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

        [HttpPost("{receiptId:long}/stamp")]
        public async Task<IActionResult> StampReceipt(long receiptId, [FromBody] ManagerReceiptStampDto dto)
        {
            try
            {
                var managerId = 2; // TODO: replace with JWT claims
                var result = await _service.StampReceiptAsync(receiptId, dto, managerId);
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
