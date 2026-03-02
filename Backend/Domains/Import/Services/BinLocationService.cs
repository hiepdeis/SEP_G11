using Backend.Data;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class BinLocationService : IBinLocationService
    {
        private readonly MyDbContext _context;

        public BinLocationService(MyDbContext context)
        {
            _context = context;
        }

        public async Task<List<BinLocation>> GetAllBinLocationAsyn()
        {
            return await _context.BinLocations.ToListAsync();
        }
    }
}
