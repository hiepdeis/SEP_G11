using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers
{
    [ApiController]
    [Route("api/receipts")]
    [Authorize(Roles = "WarehouseManager,Accountant,Admin", Policy = "ActiveUserOnly")]
    public class ReceiptSignaturesController : ControllerBase
    {
        private readonly IReceiptService _service;

        public ReceiptSignaturesController(IReceiptService service)
        {
            _service = service;
        }

        [HttpGet("{receiptId:long}/signatures")]
        public async Task<IActionResult> GetReceiptSignatures(long receiptId)
        {
            try
            {
                var result = await _service.GetReceiptSignaturesAsync(receiptId);
                return Ok(result);
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
    }
}
