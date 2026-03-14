using System.ComponentModel.DataAnnotations;


namespace Backend.Domains.outbound.Dtos
{
    public class CreateIssueSlipDto
    {
        [Required]
        public int ProjectId { get; set; }

        [Required]
        public string IssueCode { get; set; }

        [Required]
        public int UserId { get; set; }

        public string? Description { get; set; }

        public string? WorkItem { get; set; }

        public string? Department { get; set; }

        public string? DeliveryLocation { get; set; }

        public string? ReferenceCode { get; set; }

    }
}
