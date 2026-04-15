using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminTest.TestHelpers;

internal static class TestDbContextFactory
{
    public static MyDbContext Create()
    {
        var options = new DbContextOptionsBuilder<MyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new MyDbContext(options);
    }
}
