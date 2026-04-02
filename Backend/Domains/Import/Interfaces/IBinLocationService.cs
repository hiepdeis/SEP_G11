using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface IBinLocationService
    {
        Task<List<BinLocation>> GetAllBinLocationAsyn();
    }
}