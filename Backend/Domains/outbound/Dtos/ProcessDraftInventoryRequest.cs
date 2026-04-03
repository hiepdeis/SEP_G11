namespace Backend.Domains.outbound.Dtos
{
    public class ProcessDraftInventoryRequest
    {
        // Danh sách quyết định cho từng dòng vật tư (Ví dụ: "Stock", "Split", "DirectPO")
        public List<ItemDecision> Decisions { get; set; } = new List<ItemDecision>();

        // Danh sách các Lô (Batch) đã được chỉ định xuất kho cho từng dòng vật tư
        // Key (long): Là DetailId của chi tiết vật tư
        // Value (List<FifoBatchDto>): Là danh sách các lô và số lượng bốc từ lô đó
        public Dictionary<long, List<FifoBatchDto>> CustomBatches { get; set; } = new Dictionary<long, List<FifoBatchDto>>();
    }

    public class ItemDecision
    {
        public long DetailId { get; set; }

        // Chỉ nhận 3 giá trị: "Stock" (Xuất kho), "Split" (Tách phiếu), "DirectPO" (Mua thẳng)
        public string Action { get; set; }
    }
    public class FifoBatchDto
    {
        public int BatchId { get; set; }
        public decimal QtyToTake { get; set; }
    }
}
