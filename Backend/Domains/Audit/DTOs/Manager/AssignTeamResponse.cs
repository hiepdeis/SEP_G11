namespace Backend.Domains.Audit.DTOs.Manager
{
    public class AssignTeamResponse
    {
        
            public int StockTakeId { get; set; }
            public int Added { get; set; }
            public int Updated { get; set; }
            public int Skipped { get; set; }
        }
    }

