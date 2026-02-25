using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Import.Controllers.Accountants
{
    [Route("api/accountant/[controller]")]
    [ApiController]
    public class ReceiptsController : ControllerBase
    {
        private readonly IReceiptService _receiptService;

        public ReceiptsController(IReceiptService receiptService)
        {
            _receiptService = receiptService;
        }

        private int GetCurrentUserId()
        {
            //var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            //if (string.IsNullOrEmpty(userIdClaim))
            //{
            //    throw new UnauthorizedAccessException("User not authenticated");
            //}
            //return int.Parse(userIdClaim);
            return 3;
        }



        [HttpGet("pending-review")]
        public async Task<IActionResult> GetReceiptsForAccountantReview()
        {
            try
            {
                var receipts = await _receiptService.GetReceiptsForAccountantReviewAsync();
                return Ok(receipts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReceiptDetailForAccountantReview(long id)
        {
            try
            {
                var receipt = await _receiptService.GetReceiptDetailForAccountantReviewAsync(id);

                if (receipt == null)
                {
                    return NotFound(new { message = $"Receipt {id} not found" });
                }

                return Ok(receipt);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }


        [HttpGet("{id}/available-suppliers")]
        public async Task<IActionResult> GetAvailableSuppliers(long id)
        {
            try
            {
                var suppliers = await _receiptService.GetAvailableSuppliersAsync(id);

                if (!suppliers.Any() || suppliers.All(m => !m.Suppliers.Any()))
                {
                    return Ok(new
                    {
                        materials = suppliers,
                        warning = "No active suppliers found for these materials. Please contact procurement team."
                    });
                }

                return Ok(suppliers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }


        [HttpPost("{id}/create-draft")]
        public async Task<IActionResult> CreateDraft(long id, [FromBody] CreateDraftDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                await _receiptService.CreateDraftAsync(id, dto, currentUserId);

                return Ok(new
                {
                    receiptId = id,
                    status = "Draft",
                    message = "Draft created successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPut("{id}/draft")]
        public async Task<IActionResult> UpdateDraft(long id, [FromBody] CreateDraftDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                await _receiptService.UpdateDraftAsync(id, dto, currentUserId);

                return Ok(new
                {
                    receiptId = id,
                    status = "Draft",
                    message = "Draft updated successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitForApproval(long id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                await _receiptService.SubmitForApprovalAsync(id, currentUserId);

                return Ok(new
                {
                    receiptId = id,
                    status = "Submitted",
                    message = "Receipt submitted for manager approval",
                    submittedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}