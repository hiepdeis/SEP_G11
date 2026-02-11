using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.catalog.Dtos
{
    public class CreateProjectDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = null!;

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }

        [StringLength(20)]
        public string? Status { get; set; }
    }
}
