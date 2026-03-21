using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.Admin.Dtos
{
    public class UserListItemDto
    {
        
    public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public bool Status { get; set; }
    
}
    public sealed class GetUsersQuery
    {
        public string? Search { get; set; }
        public bool? Status { get; set; }
        public int? RoleId { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public string SortBy { get; set; } = "FullName";
        public string SortDir { get; set; } = "asc";
    }
    public sealed class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }
    public sealed class UpdateUserRequest
    {
        [Required]
        public int RoleId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = null!;

        [EmailAddress]
        [MaxLength(100)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        public bool Status { get; set; }
    }
    public sealed class ChangeUserStatusRequest
    {
        public bool Status { get; set; }
    }
    public sealed class ChangeUserRoleRequest
    {
        public int RoleId { get; set; }
    }
    public sealed class RoleDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = null!;
    }
}
