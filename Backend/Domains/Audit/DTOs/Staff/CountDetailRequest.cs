namespace Backend.Domains.Audit.DTOs;

public class CountDetailRequest
{
    public decimal CountQty { get; set; }
    public string? Note { get; set; }
}
