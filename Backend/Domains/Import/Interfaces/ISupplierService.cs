using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface ISupplierService
    {
        Task<List<Supplier>> GetSuppliersAsync();
    }
}