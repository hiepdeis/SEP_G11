using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Staff
{
    [Route("api/[controller]")]
    [ApiController]
    public class StaffReceiptsController : ControllerBase
    {
        private readonly IReceiptService _receiptService;
        public StaffReceiptsController(IReceiptService receiptService)
        {
            _receiptService = receiptService;
        }

        [HttpGet("inbound-requests")]
        public async Task<IActionResult> GetAllReceiptsForWarehouse()
        {
            try
            {
                var receipts = await _receiptService.GetReceiptsForWarehouseAsync();
                return Ok(receipts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("inbound-requests/{receiptId}")]
        public async Task<IActionResult> GetReceiptDetails(long receiptId)
        {
            try
            {
                var receiptDetails = await _receiptService.GetReceiptDetailForWarehouseAsync(receiptId);
                if (receiptDetails == null)
                {
                    return NotFound(new { message = "Receipt not found" });
                }
                return Ok(receiptDetails);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
