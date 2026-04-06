using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface ISupplierService
    {
        Task<List<SupplierWithMaterialDto>> GetSuppliersAsync();
    }
}