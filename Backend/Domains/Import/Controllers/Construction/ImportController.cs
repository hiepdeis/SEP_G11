using Backend.Domains.Import.DTOs.Construction;
using Backend.Domains.Import.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Domains.Import.Controllers.Construction
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ImportController : ControllerBase
    {
        private readonly IReceiptService _receiptService;
        public ImportController(IReceiptService receiptService)
        {
            _receiptService = receiptService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }
            return int.Parse(userIdClaim);
        }

        [HttpPost("requests")]
        public async Task<IActionResult> CreateRequest([FromBody] CreateImportRequestDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var receiptId = await _receiptService.CreateRequest(dto, currentUserId);

                return Ok(new
                {
                    receiptId,
                    status = "Requested",
                    message = "Request created successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("import-excel")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportExcel([FromForm] ImportExcelRequestDto request)
        {
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(new { message = "File is required" });
            }

            if (!request.File.FileName.EndsWith(".xlsx") && !request.File.FileName.EndsWith(".xls"))
            {
                return BadRequest(new { message = "Only Excel files are allowed" });
            }

            var currentUserId = GetCurrentUserId();
            using var stream = request.File.OpenReadStream();
            await _receiptService.ImportFromExcelAsync(stream, request.WarehouseId, currentUserId);

            return Ok(new { message = "Excel imported successfully", fileName = request.File.FileName });
        }


        [HttpGet("my-requests")]
        public async Task<IActionResult> GetMyRequests()
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var requests = await _receiptService.GetMyRequestsAsync(currentUserId);

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
