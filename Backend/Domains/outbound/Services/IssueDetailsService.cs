using Backend.Data;
using Backend.Domains.outbound.Dtos;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.outbound.Services
{
    public class IssueDetailsService
    {
        private readonly MyDbContext _context;

        public IssueDetailsService(MyDbContext context)
        {
            _context = context;
        }

        // add issue slip details 
        //  public async Task<(bool Success, string Message, object? Data)> AddIssueDetailsAsync(long issueId, List<CreateIssueDetailDto> details)
        //{
        //    var issueSlip = await _context.IssueSlips.FindAsync(issueId);
        //    if (issueSlip == null)
        //    {
        //        return (false, "IssueSlip not found", null);
        //    }

        //    if (details == null || !details.Any())
        //        return (false, "Issue details is empty", null);

        //    var issueDetails = details.Select(d => new IssueDetail
        //    {
        //        IssueId = issueId,
        //        MaterialId = d.MaterialId,
        //        Quantity = d.Quantity,
        //        UnitPrice = d.UnitPrice,
        //    }).ToList();

        //    _context.IssueDetails.AddRange(issueDetails);

        //    await _context.SaveChangesAsync();

        //    return (true, "Added", new
        //    {
        //        IssueId = issueId,
        //        TotalItems = issueDetails.Count
        //    });
        //}
        public async Task<(bool Success, string Message, object? Data)> AddIssueDetailsAsync(long issueId, List<CreateIssueDetailDto> details)
        {
            var issueSlip = await _context.IssueSlips.FindAsync(issueId);
            if (issueSlip == null) return (false, "IssueSlip not found", null);

            if (details == null || !details.Any()) return (false, "Issue details is empty", null);

            var materialIds = details.Select(d => d.MaterialId).Distinct().ToList();

            // 1. QUERY TỒN KHO THỰC TẾ (Từ InventoryCurrent) VÀ GIÁ (Từ ReceiptDetail)
            var rawInventoryRecords = await _context.InventoryCurrents
                .Where(ic => materialIds.Contains(ic.MaterialId) && ((ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0)) > 0)
                .Select(ic => new
                {
                    ic.MaterialId,
                    ic.BatchId,
                    ic.Batch.CreatedDate, // Lấy ngày tạo Lô để làm FIFO
                    AvailableQtyInBin = (ic.QuantityOnHand ?? 0) - (ic.QuantityAllocated ?? 0),

                    // Móc giá thực tế của Lô từ lịch sử nhập hàng
                    BatchUnitPrice = ic.Batch.ReceiptDetails
                        .Where(rd => rd.MaterialId == ic.MaterialId)
                        .Select(rd => rd.UnitPrice)
                        .FirstOrDefault()
                })
                .ToListAsync();

            // 2. GOM NHÓM THEO LÔ (Vì 1 Lô có thể nằm rải rác ở nhiều Bin khác nhau)
            var inMemoryStock = rawInventoryRecords
                .GroupBy(x => new { x.MaterialId, x.BatchId, x.CreatedDate, x.BatchUnitPrice })
                .Select(g => new StockTracker
                {
                    MaterialId = g.Key.MaterialId,
                    BatchId = g.Key.BatchId,
                    CreatedDate = g.Key.CreatedDate,
                    UnitPrice = g.Key.BatchUnitPrice,
                    // TỔNG CỘNG TỒN KHO CỦA LÔ ĐÓ TRÊN TẤT CẢ CÁC BIN
                    TotalAvailableQty = g.Sum(x => x.AvailableQtyInBin)
                })
                .OrderBy(x => x.CreatedDate) // SẮP XẾP FIFO (Cũ nhất lên đầu)
                .ToList();

            var finalIssueDetails = new List<IssueDetail>();

            // 3. CHẠY VÒNG LẶP CẮT LÔ (FIFO)
            foreach (var d in details)
            {
                decimal qtyNeeded = d.Quantity;
                var batchesForThisMaterial = inMemoryStock.Where(s => s.MaterialId == d.MaterialId && s.TotalAvailableQty > 0).ToList();

                foreach (var batch in batchesForThisMaterial)
                {
                    if (qtyNeeded <= 0) break; // Xong rồi thì thoát

                    decimal qtyToTake = Math.Min(qtyNeeded, batch.TotalAvailableQty);

                    // Sinh dòng Yêu cầu theo Lô (Batch)
                    finalIssueDetails.Add(new IssueDetail
                    {
                        IssueId = issueId,
                        MaterialId = d.MaterialId,
                        BatchId = batch.BatchId, // Chốt nháp Lô FIFO
                        Quantity = qtyToTake,
                        UnitPrice = batch.UnitPrice ?? d.UnitPrice // Áp giá gốc của Lô vào
                    });

                    batch.TotalAvailableQty -= qtyToTake; // Trừ lùi RAM
                    qtyNeeded -= qtyToTake;
                }

                // 4. TRƯỜNG HỢP KHO THIẾU HÀNG (Cần dự toán giá để mua thêm)
                if (qtyNeeded > 0)
                {
                    finalIssueDetails.Add(new IssueDetail
                    {
                        IssueId = issueId,
                        MaterialId = d.MaterialId,
                        BatchId = null, // Kho không có sẵn Lô nào
                        Quantity = qtyNeeded,
                        UnitPrice = d.UnitPrice // Trả về giá trung bình dự toán (để Check Budget)
                    });
                }
            }

            _context.IssueDetails.AddRange(finalIssueDetails);
            await _context.SaveChangesAsync();

            return (true, "Added successfully with FIFO allocation", new
            {
                IssueId = issueId,
                TotalRequestedItems = details.Count,
                ActualDetailRowsGenerated = finalIssueDetails.Count
            });
        }

        // Class helper nội bộ
        class StockTracker
        {
            public int MaterialId { get; set; }
            public int BatchId { get; set; }
            public DateTime? CreatedDate { get; set; }
            public decimal? UnitPrice { get; set; }
            public decimal TotalAvailableQty { get; set; }
        }
    }
}
