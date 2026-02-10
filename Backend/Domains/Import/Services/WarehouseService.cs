using Backend.Domains.Import.DTOs.Constructions;
using Backend.Domains.Import.Interfaces;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class WarehouseService : IWarehouseService
    {
        private readonly CapstoneSemester9Context _context;

        public WarehouseService(CapstoneSemester9Context context)
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
