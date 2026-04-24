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
            var now = DateTime.Now;

            return _context.Suppliers
                .Where(s => s.SupplierContracts.Any(sc => 
                    sc.IsActive && 
                    sc.Status == "Active" && 
                    sc.EffectiveFrom <= now && 
                    (sc.EffectiveTo == null || sc.EffectiveTo >= now)))
                .Select(s => new SupplierWithMaterialDto
                {
                    SupplierId = s.SupplierId,
                    Name = s.Name,
                    MaterialIds = s.SupplierQuotations
                        .Where(sq => sq.IsActive == true && 
                                     (sq.ValidFrom == null || sq.ValidFrom <= now) && 
                                     (sq.ValidTo == null || sq.ValidTo >= now))
                        .Select(sq => sq.MaterialId)
                        .Distinct()
                        .ToList()
                })
                .Where(dto => dto.MaterialIds.Any())
                .ToListAsync();
        }
    }
}