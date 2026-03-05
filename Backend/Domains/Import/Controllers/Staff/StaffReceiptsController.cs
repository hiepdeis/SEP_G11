using Backend.Domains.Import.DTOs.Staff;
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
        private readonly IBinLocationService _binLocationService;
        public StaffReceiptsController(IReceiptService receiptService, IBinLocationService binLocationService)
        {
            _receiptService = receiptService;
            _binLocationService = binLocationService;
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

        [HttpPost("inbound-requests/{receiptId}/confirm")]
        public async Task<IActionResult> ConfirmGoodsReceipt(long receiptId, [FromBody] ConfirmGoodsReceiptDto dto)
        {
            try
            {
                var staffId = 4;
                var staffName = "Staff";

                await _receiptService.ConfirmGoodsReceiptAsync(receiptId, dto, staffId);
                return Ok(new { message = "Goods receipt confirmed successfully" });
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

        [HttpGet("binLocation-requests")]
        public async Task<IActionResult> GetAllBinLocation()
        {
            try
            {
                var binLocation = await _binLocationService.GetAllBinLocationAsyn();
                return Ok(binLocation);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// Warehouse cards list, support filter: warehouseId, materialId, binId, fromDate, toDate, transactionType.
        [HttpGet("warehouse-cards")]
        public async Task<IActionResult> GetWarehouseCards([FromQuery] WarehouseCardQueryDto query)
        {
            try
            {
                var cards = await _receiptService.GetWarehouseCardsAsync(query);
                return Ok(cards);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/staffreceipts/warehouse-cards/{materialId}
        /// Get warehouse cards for a specific material, sorted by transaction date descending.
        /// </summary>
        [HttpGet("warehouse-cards/{materialId:int}")]
        public async Task<IActionResult> GetWarehouseCardsByMaterial(int materialId)
        {
            try
            {
                var cards = await _receiptService.GetWarehouseCardsByMaterialAsync(materialId);
                return Ok(cards);
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
