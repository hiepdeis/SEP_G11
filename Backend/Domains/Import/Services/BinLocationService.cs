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
            return await _context.BinLocations.Select(c => new BinLocation
            {
                BinId = c.BinId,
                Code = c.Code,
                CurrentMaterialId = c.CurrentMaterialId,
                MaxStockLevel = c.MaxStockLevel,
                Warehouse = c.Warehouse == null ? null : new Warehouse
                {
                    WarehouseId = c.Warehouse.WarehouseId,
                    Name = c.Warehouse.Name
                }
            }).ToListAsync();
        }
    }
}
