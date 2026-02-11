using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.catalog.Dtos
{
    public class CreateBatchDto
    {
        [Required]
        public int MaterialId { get; set; }

        [Required]
        [StringLength(50)]
        public string BatchCode { get; set; } = null!;

        public DateTime? MfgDate { get; set; }

        public string? CertificateImage { get; set; }
    }
}
