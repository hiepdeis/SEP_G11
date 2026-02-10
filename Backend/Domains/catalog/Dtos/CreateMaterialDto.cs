using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.catalog.Dtos
{
    public class CreateMaterialDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = null!;

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [StringLength(20)]
        public string? Unit { get; set; }

        public decimal? MassPerUnit { get; set; }

        public int? MinStockLevel { get; set; }
    }
}
