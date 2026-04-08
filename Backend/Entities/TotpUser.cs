using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;


namespace Backend.Entities
{
    [Table("totp_user")]
    [Index("UserId", Name = "UQ__TotpUser__UserId", IsUnique = true)]
    public partial class TotpUser
    {
        [Key]
        [Column("TotpID")]
        public int TotpId { get; set; }

        [Column("UserID")]
        public int UserId { get; set; }

        [Required]
        [StringLength(100)]
        [Column("SecretKey")]
        public string SecretKey { get; set; } = null!;

        [Column("IsEnabled")]
        public bool IsEnabled { get; set; } = false;

        [Column("FailedAttempts")]
        public int FailedAttempts { get; set; } = 0;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("VerifiedAt")]
        public DateTime? VerifiedAt { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
