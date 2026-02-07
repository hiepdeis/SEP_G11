using Backend.Domains.Import.DTOs.Constructions;

namespace Backend.Domains.Import.Interfaces
{
    public interface IWarehouseService
    {
        Task<List<WarehouseListItemDto>> GetAllAsync();
    }
}
