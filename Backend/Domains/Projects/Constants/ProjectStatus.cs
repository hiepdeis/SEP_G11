namespace Backend.Domains.Projects.Constants
{
    public static class ProjectStatus
    {
        public const string Active = "Active";
        public const string Pending = "Pending";
        public const string Closed = "Closed";

        public static readonly string[] AllStatuses = { Active, Pending, Closed };
    }
}