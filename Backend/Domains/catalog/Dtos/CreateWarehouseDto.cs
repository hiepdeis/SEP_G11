using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.catalog.Dtos
{
    public class CreateWarehouseDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        [StringLength(255)]
        public string? Address { get; set; }
    }
}
