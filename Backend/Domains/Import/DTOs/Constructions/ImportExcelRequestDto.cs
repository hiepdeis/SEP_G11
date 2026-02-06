using Microsoft.AspNetCore.Http;

namespace Backend.Domains.Import.DTOs.Construction
{
    public class ImportExcelRequestDto
    {
        public IFormFile File { get; set; } = default!;
        public int WarehouseId { get; set; }
    }
}