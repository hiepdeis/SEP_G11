using Backend.Entities;

namespace Backend.Domains.Import.DTOs.Internal
{
    public class StockShortageDetectResultDto
    {
        public int TotalScanned { get; set; }
        public int NewAlerts { get; set; }
        public int UpdatedAlerts { get; set; }
        public List<StockShortageAlert> Alerts { get; set; } = new();
    }
}
