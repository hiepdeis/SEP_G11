using Backend.Data;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class SupplierService : ISupplierService
    {
        private readonly MyDbContext _context;
        public SupplierService(MyDbContext context)
        {
            _context = context;
        }
        public Task<List<Supplier>> GetSuppliersAsync()
        {
            return _context.Suppliers.Select(s => new Supplier
            {
                SupplierId = s.SupplierId,
                Name = s.Name,
            }).ToListAsync();
        }
    }
}