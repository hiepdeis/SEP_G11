using Backend.Data;
using Backend.Domains.outbound.Dtos;
using Backend.Entities;

namespace Backend.Domains.outbound.Services
{
    public class IssueDetailsService
    {
        private readonly MyDbContext _context;

        public IssueDetailsService(MyDbContext context)
        {
            _context = context;
        }

        // add issue slip details 
        public async Task<(bool Success, string Message, object? Data)> AddIssueDetailsAsync(long issueId, List<CreateIssueDetailDto> details)
        {
            var issueSlip = await _context.IssueSlips.FindAsync(issueId);
            if (issueSlip == null)
            {
                return (false, "IssueSlip not found", null);
            }

            if (details == null || !details.Any())
                return (false, "Issue details is empty", null);

            var issueDetails = details.Select(d => new IssueDetail
            {
                IssueId = issueId,
                MaterialId = d.MaterialId,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
            }).ToList();

            _context.IssueDetails.AddRange(issueDetails);

            await _context.SaveChangesAsync();

            return (true, "Added", new
            {
                IssueId = issueId,
                TotalItems = issueDetails.Count
            });
        }
    }
}
