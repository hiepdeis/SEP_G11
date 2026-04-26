using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.Interfaces;
using Backend.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Import.Controllers.Staff
{
    [Route("api/staff/receipts")]
    [ApiController]
    [Authorize(Roles = "WarehouseStaff, WarehouseManager", Policy = "ActiveUserOnly")]
    public class StaffReceiptsController : ControllerBase
    {
        private readonly IReceiptService _receiptService;
        private readonly IBinLocationService _binLocationService;
        public StaffReceiptsController(IReceiptService receiptService, IBinLocationService binLocationService)
        {
            _receiptService = receiptService;
            _binLocationService = binLocationService;
        }

        private int GetStaffId()
        {
            return User.GetRequiredUserId();
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
                var staffId = GetStaffId();

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

        [HttpPost("/api/staff/receipts/from-po")]
        public async Task<IActionResult> ReceiveGoodsFromPurchaseOrder([FromBody] ReceiveGoodsFromPoDto dto)
        {
            try
            {
                var staffId = GetStaffId();
                var result = await _receiptService.ReceiveGoodsFromPOAsync(dto, staffId);
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

        [HttpPost("{receiptId}/putaway")]
        public async Task<IActionResult> Putaway(long receiptId, [FromBody] ReceiptPutawayDto dto)
        {
            try
            {
                var staffId = GetStaffId();
                var result = await _receiptService.PutawayAsync(receiptId, dto, staffId);
                // trung bình giá cập lại bảng materials, theo totalamount của phiếu nahapj 
                // totalamount của phiếu nhập = totalamount của nhiều material id trong phiếu nhập = totalamoutn trong kho 
                // tổng số lượng vật tư quantity onhand những cái trùng materialid  

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

        [HttpGet("pending-pos")]
        public async Task<IActionResult> GetPendingPurchaseOrders()
        {
            try
            {
                var result = await _receiptService.GetPendingPurchaseOrdersAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("pending-pos/{purchaseOrderId:long}")]
        public async Task<IActionResult> GetPendingPurchaseOrderDetail(long purchaseOrderId)
        {
            try
            {
                var result = await _receiptService.GetPendingPurchaseOrderDetailAsync(purchaseOrderId);
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("pending-pos/supplementary/{supplementaryReceiptId:long}")]
        public async Task<IActionResult> GetPendingSupplementaryReceiptDetail(long supplementaryReceiptId)
        {
            try
            {
                var result = await _receiptService.GetPendingSupplementaryReceiptDetailAsync(supplementaryReceiptId);
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("pending-putaway")]
        public async Task<IActionResult> GetPendingPutawayReceipts()
        {
            try
            {
                var result = await _receiptService.GetPendingPutawayReceiptsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("pending-putaway/{receiptId:long}")]
        public async Task<IActionResult> GetPendingPutawayReceiptDetail(long receiptId)
        {
            try
            {
                var result = await _receiptService.GetPendingPutawayReceiptDetailAsync(receiptId);
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
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("batches")]
        public async Task<IActionResult> GetBatches([FromQuery] int materialId, [FromQuery] string? batchCode)
        {
            try
            {
                var result = await _receiptService.GetBatchesAsync(materialId, batchCode);
                return Ok(result);
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

        /// <summary>
        /// GET /api/staff/receipts/{receiptId}/qc-check
        /// Lấy kết quả QC check của một phiếu nhập kho.
        /// </summary>
        [HttpGet("{receiptId}/qc-check")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetQCCheck(long receiptId)
        {
            try
            {
                var result = await _receiptService.GetQCCheckByReceiptAsync(receiptId);
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

        /// <summary>
        /// POST /api/staff/receipts/{receiptId}/incident-report
        /// Lập biên bản bất thường khi nhận hàng có sự cố.
        /// Status receipt: Approved or GoodsArrived
        /// </summary>
        [HttpPost("{receiptId}/incident-report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateIncidentReport(long receiptId, [FromBody] CreateIncidentReportDto dto)
        {
            try
            {
                var staffId = GetStaffId();
                var result = await _receiptService.CreateIncidentReportAsync(receiptId, dto, staffId);
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

        /// <summary>
        /// Lấy biên bản bất thường của một phiếu nhập kho.
        /// </summary>
        [HttpGet("{receiptId}/incident-report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetIncidentReport(long receiptId)
        {
            try
            {
                var result = await _receiptService.GetIncidentReportByReceiptAsync(receiptId);
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

        /// <summary>
        /// Danh sách tất cả biên bản bất thường (for manager review).
        /// </summary>
        [HttpGet("incident-reports")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllIncidentReports()
        {
            try
            {
                var result = await _receiptService.GetAllIncidentReportsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
