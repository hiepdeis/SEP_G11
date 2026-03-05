using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class UpdateBinLocationsRequest
    {
        /// <summary>
        /// Danh sách BinLocationIds thay thế.
        /// Nếu rỗng hoặc null, sẽ xóa toàn bộ bin-location.
        /// </summary>
        public List<int>? BinLocationIds { get; set; }
    }
}
