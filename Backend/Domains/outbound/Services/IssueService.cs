using Backend.Data;
using Backend.Domains.outbound.Dtos;
using Backend.Domains.outbound.Interface;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.outbound.Services
{
    public class IssueService : IIssueSlipWorkflowService
    {
        private readonly MyDbContext _context;

        public IssueService(MyDbContext context)
        {
            _context = context;
        }

        // add issueslips 
        public async Task<(bool Success, string Message, object? Data)> CreateIssueSlipAsync(CreateIssueSlipDto dto)
        {
            if (dto == null)
            {
                return (false, "Invalid data.", null);
            }

            var isStockTakeActive = await _context.StockTakeLocks.AnyAsync(l => l.IsActive);
            if (isStockTakeActive)
            {
                return (false, "A stock take is currently in progress. Material issue requests cannot be created at this time.", null);
            }

            var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == dto.ProjectId);
            if (!projectExists)
            {
                return (false, $"Project with ID {dto.ProjectId} not found.", null);
            }

            var issueSlip = new IssueSlip
            {
                IssueCode = dto.IssueCode,
                ProjectId = dto.ProjectId,
                CreatedBy = dto.UserId,
                IssueDate = DateTime.UtcNow,
                Status = "Pending_Review",
                Description = dto.Description,
                WorkItem = dto.WorkItem,
                Department = dto.Department,
                DeliveryLocation = dto.DeliveryLocation,
                ReferenceCode = dto.ReferenceCode
            };

            _context.IssueSlips.Add(issueSlip);
            await _context.SaveChangesAsync();

            return (true, "Created", new
            {
                issueId = issueSlip.IssueId,
                issueCode = issueSlip.IssueCode
            });
        }


        public async Task<(bool Success, string Message)> ForwardToWarehouseAsync(long slipId, string reason)
        {
            var slip = await _context.IssueSlips.FindAsync(slipId);
            if (slip == null)
                return (false, $"Không tìm thấy phiếu yêu cầu với ID {slipId}.");
            if (slip.Status != "Draft_Issue_Note")
                return (false, "Sai luồng nghiệp vụ: Chỉ phiếu xuất kho Nháp mới được gửi cho Thủ kho."); 
            slip.Status = "Pending_Warehouse_Approval";
            string logEntry = $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Kế toán gửi kho";
            if (!string.IsNullOrEmpty(reason))
            {
                logEntry += $". Lý do: {reason}";
            }
            logEntry += ")";
            slip.Description += logEntry;
            await _context.SaveChangesAsync();
            return (true, "Gửi phiếu cho Thủ kho thành công!");
        }


        public async Task<(bool Success, string Message)> ForwardToPurchasingAsync(long slipId, int createdBy, string reason)
        {
            // 1. Tìm phiếu và kèm theo chi tiết vật tư (IssueDetails)
            var slip = await _context.IssueSlips
                .Include(x => x.IssueDetails)
                .FirstOrDefaultAsync(x => x.IssueId == slipId);

            // 2. Validate dữ liệu
            if (slip == null)
                return (false, $"Không tìm thấy phiếu yêu cầu với ID {slipId}.");
            if (slip.Status != "Draft_Direct_PO")
                return (false, "Sai luồng nghiệp vụ: Chỉ đơn mua Nháp mới được gửi cho phòng Thu mua.");
            // transactions rollback 
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 3. Khởi tạo Đơn mua ngoài chính thức
                var newDpo = new DirectPurchaseOrder
                {
                    DpoCode = "DPO-" + DateTime.Now.ToString("yyMMdd") + "-" + new Random().Next(1000, 9999),
                    ReferenceCode = slip.IssueCode, 
                    ProjectId = slip.ProjectId,
                    CreatedBy = createdBy, 
                    OrderDate = DateTime.UtcNow,
                    Status = "Pending_Supplier_Selection", 
                    SupplierId = null, 
                    Description = $"Chuyển từ đơn mua nháp {slip.IssueCode}.",

                    DirectPurchaseDetails = slip.IssueDetails.Select(detail => new DirectPurchaseDetail
                    {
                        MaterialId = detail.MaterialId,
                        Quantity = detail.Quantity,
                        NegotiatedUnitPrice = detail.UnitPrice ?? 0 
                    }).ToList()
                };

                _context.DirectPurchaseOrders.Add(newDpo);
                slip.Status = "Forwarded_To_Purchasing";
                slip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Đã khởi tạo đơn mua ngoài chính thức [{newDpo.DpoCode}].)";

                if (!string.IsNullOrEmpty(reason))
                {
                    slip.Description += $"\n(Ghi chú: {reason})";
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "Chuyển đơn mua nháp cho phòng Thu mua thành công!");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, $"Lỗi hệ thống khi tạo đơn mua ngoài: {ex.Message}");
            }
        }

        public async Task<(bool Success, string Message)> StartPickingAsync(long slipId, int assignedPickerId, string reason)
        {
            var slip = await _context.IssueSlips.FindAsync(slipId);

            if (slip == null)
                return (false, $"Không tìm thấy phiếu yêu cầu với ID {slipId}.");
            // Chặn luồng: Chỉ phiếu đang nằm ở hàng đợi của kho mới được phân công
            if (slip.Status != "Pending_Warehouse_Approval")
                return (false, "Sai luồng nghiệp vụ: Chỉ phiếu đang chờ duyệt kho mới được phân công nhặt hàng.");

            // Cập nhật người được phân công và trạng thái
            slip.AssignedPickerId = assignedPickerId;
            slip.Status = "Picking_In_Progress";

            // Ghi Log
            string logEntry = $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Kho: Quản lý kho đã phân công phiếu này cho nhân viên ID: {assignedPickerId}";
            if (!string.IsNullOrEmpty(reason)) logEntry += $". Ghi chú: {reason}";
            logEntry += ")";

            slip.Description += logEntry;

            await _context.SaveChangesAsync();
            return (true, "Phân công nhân viên nhặt hàng thành công.");
        }

        public async Task<(bool Success, string Message)> FinishPickingAndDeductInventoryAsync(long slipId, int actualPickerId, string reason)
        {
            // 1. Kéo phiếu, chi tiết và danh sách cần nhặt lên
            var slip = await _context.IssueSlips
                .Include(x => x.IssueDetails)
                    .ThenInclude(d => d.PickingLists)
                .FirstOrDefaultAsync(x => x.IssueId == slipId);

            if (slip == null)
                return (false, $"Không tìm thấy phiếu yêu cầu với ID {slipId}.");
            if (slip.Status != "Picking_In_Progress")
                return (false, "Sai luồng nghiệp vụ: Phiếu chưa ở trạng thái đang nhặt hàng.");

            // =====================================================================
            // [TỐI ƯU HIỆU NĂNG] Kéo tất cả Tồn kho liên quan lên RAM để tránh N+1 Query
            // =====================================================================
            var materialIds = slip.IssueDetails.Select(d => d.MaterialId).Distinct().ToList();

            var inventoryRecords = await _context.InventoryCurrents
                .Where(ic => ic.WarehouseId == slip.WarehouseId && materialIds.Contains(ic.MaterialId))
                .ToListAsync(); // ToListAsync() đập data vào RAM tại đây

            // BẬT TRANSACTION: Đảm bảo trừ kho và đổi trạng thái phiếu phải đồng thời thành công
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Tiến hành trừ kho vật lý
                foreach (var detail in slip.IssueDetails)
                {
                    foreach (var pick in detail.PickingLists)
                    {
                        pick.IsPicked = true;
                        pick.ActualPickerId = actualPickerId; // Ghi nhận người thực tế đi nhặt

                        // Tìm Record tồn kho ngay trên RAM, cực kỳ nhanh!
                        var inventoryRecord = inventoryRecords.FirstOrDefault(ic =>
                            ic.MaterialId == detail.MaterialId &&
                            ic.BatchId == pick.BatchId &&
                            ic.BinId == pick.BinId);

                        if (inventoryRecord != null)
                        {
                            // A. Trừ tồn kho thực tế
                            inventoryRecord.QuantityOnHand = (inventoryRecord.QuantityOnHand ?? 0) - pick.QtyToPick;

                            // B. Giải phóng tồn kho giữ chỗ
                            inventoryRecord.QuantityAllocated = (inventoryRecord.QuantityAllocated ?? 0) - pick.QtyToPick;

                            inventoryRecord.LastUpdated = DateTime.UtcNow;

                            // Safe check chống âm số
                            if (inventoryRecord.QuantityAllocated < 0) inventoryRecord.QuantityAllocated = 0;
                            if (inventoryRecord.QuantityOnHand < 0) inventoryRecord.QuantityOnHand = 0;
                        }
                    }
                }

                // 3. Đóng gói phiếu, sẵn sàng vận chuyển
                slip.Status = "Ready_For_Delivery";

                // 4. Ghi Log (Lưu lại chính xác ai là người trừ kho)
                string logEntry = $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Kho: Đã xuất hàng và trừ tồn kho vật lý. Thực hiện bởi ID: {actualPickerId}";
                if (!string.IsNullOrEmpty(reason)) logEntry += $". Ghi chú: {reason}";
                logEntry += ")";

                slip.Description += logEntry;

                // 5. Xác nhận lưu
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "Xuất kho vật lý thành công!");
            }
            catch (Exception ex)
            {
                // Nếu lỗi DB giữa chừng (ví dụ chết mạng), nhả kho ra nguyên vẹn như cũ
                await transaction.RollbackAsync();
                return (false, $"Lỗi hệ thống khi xuất kho: {ex.Message}");
            }
        }


        public async Task<(bool Success, string Message)>  CompleteReceiptAsync(long slipId, string reason)
        {
            // 1. Kéo phiếu, chi tiết và dự án lên
            var slip = await _context.IssueSlips
                .Include(x => x.Project)
                .Include(x => x.IssueDetails)
                .FirstOrDefaultAsync(x => x.IssueId == slipId);

            if (slip == null)
                return (false, "Không tìm thấy phiếu.");

            if (slip.Status != "Ready_For_Delivery")
                return (false, "Sai luồng nghiệp vụ: Phiếu phải ở trạng thái đang giao hàng mới có thể xác nhận.");
            // BẬT TRANSACTION
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Cập nhật trạng thái
                slip.Status = "Completed";

                // 3. Tính tiền và trừ ngân sách dự án
                if (slip.Project != null)
                {
                    decimal totalSlipCost = slip.IssueDetails.Sum(d => d.Quantity * (d.UnitPrice ?? 0));
                    slip.Project.BudgetUsed = (slip.Project.BudgetUsed ?? 0) + totalSlipCost;

                    slip.Description += $"\n(Kế toán: Đã ghi nhận {totalSlipCost:N0} VNĐ từ kho vào chi phí dự án).";
                }

                slip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hiện trường: Kỹ sư đã xác nhận nhận đủ hàng)";
                if (!string.IsNullOrEmpty(reason)) slip.Description += $". Ghi chú: {reason}";

                // 4. Logic tự động Đóng phiếu gốc (Root Slip) dựa vào ReferenceCode
                if (!string.IsNullOrEmpty(slip.ReferenceCode))
                {
                    // [TỐI ƯU]: Chỉ check xem CÓ TỒN TẠI phiếu anh em nào CHƯA Completed hay không
                    // Lệnh này chạy thẳng xuống SQL cực nhẹ, không lôi data dư thừa lên RAM
                    bool hasUncompletedSiblings = await _context.IssueSlips
                        .AnyAsync(s => s.ReferenceCode == slip.ReferenceCode
                                    && s.IssueId != slip.IssueId
                                    && s.Status != "Completed");

                    // Nếu KHÔNG có phiếu nào CHƯA Completed -> Tức là tất cả ĐỀU ĐÃ Completed
                    if (!hasUncompletedSiblings)
                    {
                        var rootSlip = await _context.IssueSlips.FirstOrDefaultAsync(s => s.IssueCode == slip.ReferenceCode);
                        if (rootSlip != null && rootSlip.Status != "Completed")
                        {
                            rootSlip.Status = "Completed";
                            rootSlip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Toàn bộ vật tư từ các nguồn (Kho/Mua ngoài) đã được bàn giao xong. Tự động chuyển phiếu yêu cầu gốc sang Completed).";
                        }
                    }
                }

                // 5. Xác nhận lưu
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "Xác nhận nhận đủ hàng và cập nhật chi phí dự án thành công!");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, $"Lỗi hệ thống khi xác nhận nhận hàng: {ex.Message}");
            }
        }

        public async Task<(bool Success, string Message)> CloseSlipAsync(long slipId, string reason)
        {
            var slip = await _context.IssueSlips.FindAsync(slipId);

            if (slip == null)
                return(false, "Không tìm thấy phiếu.");

            if (slip.Status != "Completed")
                return (false, "Sai luồng nghiệp vụ: Phiếu phải được xác nhận nhận đủ hàng trước khi chốt sổ đóng phiếu.");
            // BẬT TRANSACTION
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                slip.Status = "Closed";
                slip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Kế toán: Đã kiểm tra chứng từ và chốt sổ tài chính)";
                if (!string.IsNullOrEmpty(reason)) slip.Description += $". Ghi chú: {reason}";

                // Logic tự động Đóng phiếu cha (Parent Slip) nếu có
                if (slip.ParentIssueId.HasValue)
                {
                    // [TỐI ƯU]: Kiểm tra xem có phiếu con nào CHƯA Closed hay không
                    bool hasUnclosedSiblings = await _context.IssueSlips
                        .AnyAsync(s => s.ParentIssueId == slip.ParentIssueId
                                    && s.IssueId != slip.IssueId
                                    && s.Status != "Closed");

                    // Nếu tất cả các phiếu con đã Closed hết
                    if (!hasUnclosedSiblings)
                    {
                        var parentSlip = await _context.IssueSlips.FindAsync(slip.ParentIssueId);
                        if (parentSlip != null && parentSlip.Status != "Closed")
                        {
                            parentSlip.Status = "Closed";
                            parentSlip.Description += $"\n({DateTime.Now:dd/MM/yyyy HH:mm} - Hệ thống: Toàn bộ các phiếu con đã hoàn tất hạch toán. Tự động đóng phiếu yêu cầu gốc).";
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "Chốt sổ và đóng phiếu thành công!");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, $"Lỗi hệ thống khi chốt sổ tài chính: {ex.Message}");
            }
        }
    }
}
