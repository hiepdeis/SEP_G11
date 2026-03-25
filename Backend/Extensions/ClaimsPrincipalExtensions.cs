using System.Security.Claims;

namespace Backend.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal user)
    {
        var idStr =
            user.FindFirstValue(ClaimTypes.NameIdentifier) ??
            user.FindFirstValue("userId") ??
            user.FindFirstValue("id") ??
            user.FindFirstValue("sub");

        if (int.TryParse(idStr, out var userId))
            return userId;

        throw new UnauthorizedAccessException("Invalid user identity.");
    }
}
