using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public partial class StockTakeBinLocation
{
    [Key]
    [Column("StockTakeBinLocationID")]
    public int StockTakeBinLocationId { get; set; }

    [Column("StockTakeID")]
    public int StockTakeId { get; set; }

    [Column("BinID")]
    public int BinId { get; set; }

    [ForeignKey("StockTakeId")]
    [InverseProperty("StockTakeBinLocations")]
    public virtual StockTake StockTake { get; set; } = null!;

    [ForeignKey("BinId")]
    [InverseProperty("StockTakeBinLocations")]
    public virtual BinLocation BinLocation { get; set; } = null!;
}
