namespace Backend.Domains.outbound.Dtos
{
    public class CreateIssueDetailDto
    {  
        public int MaterialId { get; set; }          
        
        public decimal Quantity { get; set; }      
        
        public decimal? UnitPrice { get; set; }
    }
}
