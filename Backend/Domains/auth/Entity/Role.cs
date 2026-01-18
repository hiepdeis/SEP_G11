using System.Text.Json.Serialization;

namespace Backend.Domains.auth.Entity
{
    public class Role
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        [JsonIgnore]
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
