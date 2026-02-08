namespace Backend.Domains.Audit.DTOs.Staff
{
    public class AcceptAssignmentRequest
    {
        // true = Accept, false = Decline
        public bool Accept { get; set; } = true;

        public string? Note { get; set; }
    }
}
