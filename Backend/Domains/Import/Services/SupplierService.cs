using Backend.Data;
using Backend.Domains.Import.DTOs.Purchasing;
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
        public Task<List<SupplierWithMaterialDto>> GetSuppliersAsync()
        {
            return _context.Suppliers.Select(s => new SupplierWithMaterialDto
            {
                SupplierId = s.SupplierId,
                Name = s.Name,
                MaterialIds = s.SupplierQuotations
                .Where(sq => sq.SupplierId == s.SupplierId && sq.IsActive == true) 
                .Select(sq => sq.MaterialId)
                .Distinct()
                .ToList()
            }).ToListAsync();
        }
    }
}