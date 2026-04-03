using System.ComponentModel.DataAnnotations;

namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class UpdateBinLocationsRequest
    {
        /// <summary>
        /// Danh sach BinLocationIds thay the.
        /// Neu rong hoac null, he thong hieu la kiem ke toan bo kho.
        /// </summary>
        public List<int>? BinLocationIds { get; set; }
    }
}
