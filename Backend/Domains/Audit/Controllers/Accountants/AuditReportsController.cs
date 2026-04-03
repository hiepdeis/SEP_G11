using Backend.Domains.Audit.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Audit.Controllers.Accountants
{
    [ApiController]
    [Route("api/audits")]
    [Authorize(Roles = "Accountant,Manager")]
    public sealed class AuditReportsController : ControllerBase
    {
        private readonly IAuditReportService _svc;

        public AuditReportsController(IAuditReportService svc)
        {
            _svc = svc;
        }

        [HttpGet("{stockTakeId:int}/report/pdf")]
        public async Task<IActionResult> ExportAuditReportPdf(
            int stockTakeId,
            CancellationToken ct)
        {
            try
            {
                var pdfBytes = await _svc.ExportAuditReportPdfAsync(stockTakeId, ct);

                return File(
                    pdfBytes,
                    "application/pdf",
                    $"stocktake-report-{stockTakeId}.pdf");
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
