using Microsoft.AspNetCore.Authorization;

namespace Backend.Domains.auth.Business
{
    public class ActiveUserAuthorizationHandler : AuthorizationHandler<ActiveUserRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            ActiveUserRequirement requirement)
        {
            var statusClaim = context.User.FindFirst("Status");

            if (statusClaim != null &&
                bool.TryParse(statusClaim.Value, out bool isActive) &&
                isActive)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }

            return Task.CompletedTask;
        }
    }
}