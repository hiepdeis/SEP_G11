using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Import.Controllers.Managers
{
    [Route("api/manager/[controller]")]
    [ApiController]
    public class ManagerReceiptsController : ControllerBase
    {
        private readonly IReceiptService _receiptService;

        public ManagerReceiptsController(
            IReceiptService receiptService)
        {
            _receiptService = receiptService;
        }


        [HttpGet("pending")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<List<PendingReceiptDto>>> GetReceiptForManagerReview()
        {
            try
            {
                var receipts = await _receiptService.GetReceiptForManagerReviewAsync();
                return Ok(receipts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
            }
        }


        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<PendingReceiptDto>> GetReceiptDetailForManagerReview(long id)
        {
            try
            {
                var receipt = await _receiptService.GetReceiptDetailForManagerReviewAsync(id);
                return Ok(receipt);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
            }
        }


        [HttpPost("{id}/approve")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ApproveReceipt(long id, [FromBody] ApproveReceiptDto dto)
        {
            try
            {
                var managerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
                var managerName = User.FindFirst(ClaimTypes.Name)?.Value;

                await _receiptService.ApproveReceiptAsync(id, managerId, dto);

                return Ok(new
                {
                    message = "Receipt approved successfully",
                    receiptId = id,
                    newStatus = "Approved",
                    approvedBy = managerName,
                    approvedDate = DateTime.UtcNow
                });
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
                return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
            }
        }


        [HttpPost("{id}/reject")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RejectReceipt(long id, [FromBody] RejectReceiptDto dto)
        {
            try
            {
                var managerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
                var managerName = User.FindFirst(ClaimTypes.Name)?.Value;

                await _receiptService.RejectReceiptAsync(id, managerId, dto);

                return Ok(new
                {
                    message = "Receipt rejected successfully",
                    receiptId = id,
                    newStatus = "Rejected",
                    rejectedBy = managerName,
                    rejectedDate = DateTime.UtcNow,
                    reason = dto.RejectionReason
                });
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
                return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
            }
        }
    }
}