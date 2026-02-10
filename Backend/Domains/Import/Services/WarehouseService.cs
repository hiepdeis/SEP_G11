using Backend.Data;
using Backend.Domains.Import.DTOs.Constructions;
using Backend.Domains.Import.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class WarehouseService : IWarehouseService
    {
        private readonly MyDbContext _context;

        public WarehouseService(MyDbContext context)
        {
            _context = context;
        }

        public async Task<List<WarehouseListItemDto>> GetAllAsync()
        {
            return await _context.Warehouses
                .OrderBy(w => w.Name)
                .Select(w => new WarehouseListItemDto
                {
                    WarehouseId = w.WarehouseId,
                    Name = w.Name,
                    Address = w.Address
                }).ToListAsync();
        }
    }
}
