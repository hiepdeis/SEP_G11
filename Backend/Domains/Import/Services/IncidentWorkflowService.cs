using Backend.Data;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class IncidentWorkflowService : IIncidentWorkflowService
    {
        private readonly MyDbContext _context;

        public IncidentWorkflowService(MyDbContext context)
        {
            _context = context;
        }

        public async Task<IncidentReport> SubmitIncidentToManagerAsync(long incidentId, int staffId)
        {
            // STEP 1: load incident
            var incident = await _context.IncidentReports
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            // STEP 2: validate status
            if (incident.Status != "Open")
                throw new InvalidOperationException(
                    $"Cannot submit incident {incidentId} with status '{incident.Status}'. Must be 'Open'");

            // STEP 3: transition to manager review
            incident.Status = "PendingManagerReview";

            await _context.SaveChangesAsync();

            // Notify warehouse managers for review
            await CreateRoleNotificationsAsync(
                "Manager",
                $"Incident {incident.IncidentCode} submitted for manager review.",
                "IncidentReport",
                incident.IncidentId);

            return incident;
        }

        public async Task<List<ManagerIncidentSummaryDto>> GetManagerIncidentsAsync()
        {
            // STEP 1: load incidents awaiting manager review with QC details
            var incidents = await _context.IncidentReports
                .Include(i => i.Receipt)
                .Include(i => i.IncidentReportDetails)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .Where(i => i.Status == "PendingManagerReview" || i.Status == "PendingManagerApproval")
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            // STEP 2: map to summary DTO
            return incidents.Select(i => new ManagerIncidentSummaryDto
            {
                IncidentId = i.IncidentId,
                IncidentCode = i.IncidentCode,
                ReceiptId = i.ReceiptId,
                ReceiptCode = i.Receipt?.ReceiptCode,
                SubmittedAt = i.CreatedAt,
                Status = i.Status,
                Items = MapIncidentItems(i, includeImages: false)
            }).ToList();
        }

        public async Task<ManagerIncidentDetailDto> GetManagerIncidentAsync(long incidentId)
        {
            // STEP 1: load incident with QC details
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
                    .ThenInclude(r => r.ReceiptDetails)
                        .ThenInclude(rd => rd.Material)
                .Include(i => i.IncidentReportDetails)
                    .ThenInclude(d => d.EvidenceImages)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.CheckedByNavigation)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            // STEP 2: map QC check
            var qcCheckDto = incident.QCCheck == null
                ? null
                : MapQCCheckToDto(
                    incident.QCCheck,
                    incident.Receipt?.ReceiptCode,
                    incident.QCCheck.CheckedByNavigation?.FullName);

            // STEP 3: map detail DTO
            return new ManagerIncidentDetailDto
            {
                IncidentId = incident.IncidentId,
                IncidentCode = incident.IncidentCode,
                ReceiptId = incident.ReceiptId,
                ReceiptCode = incident.Receipt?.ReceiptCode,
                Status = incident.Status,
                Description = incident.Description,
                CreatedAt = incident.CreatedAt,
                QCCheck = qcCheckDto,
                Items = MapIncidentItems(incident)
            };
        }

        public async Task<IncidentReport> ApproveIncidentAsync(long incidentId, int managerId, string? notes)
        {
            // STEP 1: load incident
            var incident = await _context.IncidentReports
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            // STEP 2: validate status
            if (incident.Status != "PendingManagerReview")
                throw new InvalidOperationException(
                    $"Cannot approve incident {incidentId} with status '{incident.Status}'. Must be 'PendingManagerReview'");

            // STEP 3: transition to purchasing action
            incident.Status = "PendingPurchasingAction";

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? "No inner exception";
                throw new InvalidOperationException($"SaveChanges failed: {inner}", ex);
            }

            // Notify purchasing team to work with supplier
            await CreateRoleNotificationsAsync(
                "Purchasing",
                $"Incident {incident.IncidentCode} approved. Please coordinate with supplier.",
                "IncidentReport",
                incident.IncidentId,
                fallbackRoleName: "Admin");

            return incident;
        }

        public async Task<List<PurchasingIncidentSummaryDto>> GetPurchasingIncidentsAsync()
        {
            // STEP 1: load incidents awaiting purchasing action with QC details
            var incidents = await _context.IncidentReports
                .Include(i => i.Receipt)
                .Include(i => i.IncidentReportDetails)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .Where(i => i.Status == "PendingPurchasingAction")
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            // STEP 2: map to summary DTO
            return incidents.Select(i => new PurchasingIncidentSummaryDto
            {
                IncidentId = i.IncidentId,
                IncidentCode = i.IncidentCode,
                ReceiptId = i.ReceiptId,
                ReceiptCode = i.Receipt?.ReceiptCode,
                CreatedAt = i.CreatedAt,
                Items = MapIncidentItems(i)
                    .Select(d => new PurchasingIncidentItemSummaryDto
                    {
                        MaterialId = d.MaterialId,
                        MaterialName = d.MaterialName,
                        OrderedQuantity = d.OrderedQuantity,
                        ActualQuantity = d.ActualQuantity,
                        PassQuantity = d.PassQuantity,
                        FailQuantity = d.FailQuantity,
                        FailQuantityQuantity = d.FailQuantityQuantity,
                        FailQuantityQuality = d.FailQuantityQuality,
                        FailQuantityDamage = d.FailQuantityDamage,
                        FailReason = d.FailReason,
                    })
                    .ToList()
            }).ToList();
        }

        public async Task<PurchasingIncidentDetailDto> GetPurchasingIncidentAsync(long incidentId)
        {
            // STEP 1: load incident with QC details
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
                .Include(i => i.IncidentReportDetails)
                    .ThenInclude(d => d.EvidenceImages)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.CheckedByNavigation)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            // STEP 2: map QC check
            var qcCheckDto = incident.QCCheck == null
                ? null
                : MapQCCheckToDto(
                    incident.QCCheck,
                    incident.Receipt?.ReceiptCode,
                    incident.QCCheck.CheckedByNavigation?.FullName);

            // STEP 3: map detail DTO
            return new PurchasingIncidentDetailDto
            {
                IncidentId = incident.IncidentId,
                IncidentCode = incident.IncidentCode,
                ReceiptId = incident.ReceiptId,
                ReceiptCode = incident.Receipt?.ReceiptCode,
                Status = incident.Status,
                Description = incident.Description,
                CreatedAt = incident.CreatedAt,
                QCCheck = qcCheckDto,
                Items = MapIncidentItems(incident)
                    .Select(d => new PurchasingIncidentItemSummaryDto
                    {
                        MaterialId = d.MaterialId,
                        MaterialName = d.MaterialName,
                        OrderedQuantity = d.OrderedQuantity,
                        ActualQuantity = d.ActualQuantity,
                        PassQuantity = d.PassQuantity,
                        FailQuantity = d.FailQuantity,
                        FailQuantityQuantity = d.FailQuantityQuantity,
                        FailQuantityQuality = d.FailQuantityQuality,
                        FailQuantityDamage = d.FailQuantityDamage,
                        FailReason = d.FailReason,
                        EvidenceImages = d.EvidenceImages
                    })
                    .ToList()
            };
        }

        public async Task<SupplementaryReceiptResultDto> CreateSupplementaryReceiptAsync(long incidentId, int purchasingId, CreateSupplementaryReceiptDto dto)
        {
            // STEP 1: validate input
            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Items list cannot be empty");

            foreach (var item in dto.Items)
            {
                if (item.SupplementaryQuantity <= 0)
                    throw new ArgumentException("SupplementaryQuantity must be greater than 0");
            }

            // STEP 2: load incident and receipt
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
                .Include(i => i.SupplementaryReceipts)
                    .ThenInclude(s => s.Items)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            if (incident.Status != "PendingPurchasingAction")
                throw new InvalidOperationException(
                    $"Cannot create supplementary receipt for incident {incidentId} with status '{incident.Status}'");

            if (incident.Receipt.PurchaseOrderId == null)
                throw new InvalidOperationException("Incident receipt is not linked to a purchase order");

            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == incident.Receipt.PurchaseOrderId.Value);

            if (purchaseOrder == null)
                throw new KeyNotFoundException("Purchase order not found for incident receipt");

            // STEP 3: validate materials exist in PO
            var poMaterialIds = purchaseOrder.Items.Select(i => i.MaterialId).ToHashSet();
            var invalidMaterials = dto.Items
                .Where(i => !poMaterialIds.Contains(i.MaterialId))
                .Select(i => i.MaterialId)
                .Distinct()
                .ToList();

            if (invalidMaterials.Any())
                throw new ArgumentException(
                    $"Supplementary items contain materials not in PO: {string.Join(", ", invalidMaterials)}");

            // STEP 3.1: enforce claim-based cap for supplementary quantities by material.
            if (incident.QCCheck == null)
                throw new InvalidOperationException("QC check is required before creating supplementary receipt");

            var requestedByMaterial = dto.Items
                .GroupBy(i => i.MaterialId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.SupplementaryQuantity));

            var existingSupplementaryByMaterial = incident.SupplementaryReceipts
                .Where(s => !string.Equals(s.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
                .SelectMany(s => s.Items)
                .GroupBy(i => i.MaterialId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.SupplementaryQuantity));

            foreach (var request in requestedByMaterial)
            {
                var materialId = request.Key;
                var requestedQty = request.Value;

                var qcDetail = incident.QCCheck.QCCheckDetails
                    .FirstOrDefault(d => d.ReceiptDetail != null && d.ReceiptDetail.MaterialId == materialId);

                if (qcDetail == null)
                {
                    throw new ArgumentException(
                        $"MaterialId {materialId} is not present in incident QC details");
                }

                var configuredClaimQty =
                    (qcDetail.FailQuantityQuantity ?? 0) +
                    (qcDetail.FailQuantityQuality ?? 0) +
                    (qcDetail.FailQuantityDamage ?? 0);

                var fallbackClaimQty = Math.Max(0, (qcDetail.ReceiptDetail?.Quantity ?? 0) - qcDetail.PassQuantity);
                var totalClaimQty = configuredClaimQty > 0 ? configuredClaimQty : fallbackClaimQty;

                var alreadyRequestedQty = existingSupplementaryByMaterial.TryGetValue(materialId, out var existingQty)
                    ? existingQty
                    : 0m;

                var remainingClaimQty = totalClaimQty - alreadyRequestedQty;

                if (remainingClaimQty <= 0.0001m)
                {
                    throw new InvalidOperationException(
                        $"MaterialId {materialId} has no remaining claim quantity for supplementary receipt");
                }

                if (requestedQty - remainingClaimQty > 0.0001m)
                {
                    throw new ArgumentException(
                        $"SupplementaryQuantity for MaterialId {materialId} exceeds remaining claim quantity ({remainingClaimQty:F4}). " +
                        $"Requested={requestedQty:F4}, Claim={totalClaimQty:F4}, AlreadyRequested={alreadyRequestedQty:F4}");
                }
            }

            // STEP 4: create supplementary receipt and update incident status
            var rejectedParent = await _context.SupplementaryReceipts
                .AsNoTracking()
                .Where(s => s.IncidentId == incidentId)
                .Where(s => s.Status == "Rejected")
                .OrderByDescending(s => s.RevisionNumber)
                .ThenByDescending(s => s.SupplementaryReceiptId)
                .Select(s => new
                {
                    s.SupplementaryReceiptId,
                    s.RevisionNumber
                })
                .FirstOrDefaultAsync();

            var parentReceiptId = rejectedParent?.SupplementaryReceiptId;
            var nextRevisionNumber = rejectedParent == null ? 1 : rejectedParent.RevisionNumber + 1;

            var now = DateTime.UtcNow;
            var supplementaryReceipt = new SupplementaryReceipt
            {
                ParentReceiptId = parentReceiptId,
                RevisionNumber = nextRevisionNumber,
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                IncidentId = incidentId,
                Status = "PendingManagerApproval",
                SupplierNote = dto.SupplierNote,
                ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
                CreatedByPurchasingId = purchasingId,
                CreatedAt = now,
                Items = dto.Items.Select(i => new SupplementaryReceiptItem
                {
                    MaterialId = i.MaterialId,
                    SupplementaryQuantity = i.SupplementaryQuantity
                }).ToList()
            };

            _context.SupplementaryReceipts.Add(supplementaryReceipt);

            incident.Status = "PendingManagerApproval";

            await _context.SaveChangesAsync();

            // Notify manager to approve supplementary receipt
            await CreateRoleNotificationsAsync(
                "Manager",
                $"Supplementary receipt {supplementaryReceipt.SupplementaryReceiptId} awaiting manager approval.",
                "SupplementaryReceipt",
                supplementaryReceipt.SupplementaryReceiptId);

            var totalSupplementaryQty = supplementaryReceipt.Items.Sum(i => i.SupplementaryQuantity);

            return new SupplementaryReceiptResultDto
            {
                SupplementaryReceiptId = supplementaryReceipt.SupplementaryReceiptId,
                PurchaseOrderId = supplementaryReceipt.PurchaseOrderId,
                Status = supplementaryReceipt.Status,
                TotalSupplementaryQty = totalSupplementaryQty,
                NextStep = $"POST /api/manager/incidents/{incidentId}/approve-supplementary"
            };
        }

        public async Task<ManagerSupplementaryReceiptDto> GetSupplementaryReceiptAsync(long incidentId)
        {
            // STEP 1: load supplementary receipt for the incident
            var supplementaryReceipt = await _context.SupplementaryReceipts
                .Include(s => s.Items)
                    .ThenInclude(i => i.Material)
                .Where(s => s.IncidentId == incidentId)
                .OrderByDescending(s => s.RevisionNumber)
                .ThenByDescending(s => s.SupplementaryReceiptId)
                .FirstOrDefaultAsync();

            if (supplementaryReceipt == null)
                throw new KeyNotFoundException($"Supplementary receipt for incident {incidentId} not found");

            // STEP 2: map to DTO
            return new ManagerSupplementaryReceiptDto
            {
                SupplementaryReceiptId = supplementaryReceipt.SupplementaryReceiptId,
                PurchaseOrderId = supplementaryReceipt.PurchaseOrderId,
                IncidentId = supplementaryReceipt.IncidentId,
                Status = supplementaryReceipt.Status,
                SupplierNote = supplementaryReceipt.SupplierNote,
                ExpectedDeliveryDate = supplementaryReceipt.ExpectedDeliveryDate,
                CreatedAt = supplementaryReceipt.CreatedAt,
                Items = supplementaryReceipt.Items.Select(i => new ManagerSupplementaryReceiptItemDto
                {
                    MaterialId = i.MaterialId,
                    MaterialName = i.Material?.Name,
                    SupplementaryQuantity = i.SupplementaryQuantity
                }).ToList()
            };
        }

        public async Task<ManagerSupplementaryApprovalResultDto> ApproveSupplementaryReceiptAsync(
            long incidentId,
            int managerId,
            string? notes)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            // STEP 1: load incident, receipt, QC, and supplementary receipt
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            if (incident.Status != "PendingManagerApproval")
                throw new InvalidOperationException(
                    $"Cannot approve supplementary receipt for incident {incidentId} with status '{incident.Status}'");

            var supplementaryReceipt = await LoadLatestSupplementaryReceiptForDecisionAsync(incidentId);

            await EnsureLatestSupplementaryRevisionAsync(supplementaryReceipt.SupplementaryReceiptId);

            if (supplementaryReceipt.Status != "PendingManagerApproval")
                throw new InvalidOperationException(
                    $"Cannot approve supplementary receipt {supplementaryReceipt.SupplementaryReceiptId}. Current status: '{supplementaryReceipt.Status}'");

            if (incident.Receipt.PurchaseOrderId == null)
                throw new InvalidOperationException("Incident receipt is not linked to a purchase order");

            if (!incident.Receipt.WarehouseId.HasValue)
                throw new InvalidOperationException("Incident receipt has no warehouse assigned");

            // STEP 2: summarize quantities (no inventory changes here)
            if (incident.QCCheck == null)
                throw new InvalidOperationException("QC check is required before approving supplementary receipt");

            var totalPassQuantity = incident.QCCheck.QCCheckDetails.Sum(d => d.PassQuantity);
            var supplementaryQuantityPending = supplementaryReceipt.Items.Sum(i => i.SupplementaryQuantity);
            var today = DateTime.UtcNow;

            // STEP 3: transition statuses
            incident.Status = "AwaitingSupplementaryGoods";
            supplementaryReceipt.Status = "Approved";
            supplementaryReceipt.ApprovedByManagerId = managerId;
            supplementaryReceipt.ApprovedAt = today;
            incident.Receipt.Status = "ReadyForPutaway";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var purchaseOrderCode = incident.Receipt.PurchaseOrderId.HasValue
                ? await _context.PurchaseOrders
                    .Where(p => p.PurchaseOrderId == incident.Receipt.PurchaseOrderId.Value)
                    .Select(p => p.PurchaseOrderCode)
                    .FirstOrDefaultAsync()
                : null;

            var message = string.IsNullOrWhiteSpace(purchaseOrderCode)
                ? $"Da duyet phieu bo sung. Vui long xep {totalPassQuantity} cai vao kho."
                : $"Da duyet phieu bo sung {purchaseOrderCode}. Vui long xep {totalPassQuantity} cai vao kho.";

            await CreateRoleNotificationsAsync(
                "Staff",
                message,
                "Receipt",
                incident.ReceiptId);

            return new ManagerSupplementaryApprovalResultDto
            {
                IncidentId = incidentId,
                PassQuantityAdded = totalPassQuantity,
                SupplementaryQuantityPending = supplementaryQuantityPending,
                PoStatus = string.Empty,
                NextStep = $"POST /api/staff/receipts/{incident.ReceiptId}/putaway"
            };
        }

        public async Task<ManagerSupplementaryRejectResultDto> RejectSupplementaryReceiptAsync(
            long incidentId,
            int managerId,
            string reason)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            // STEP 1: validate input
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Reason is required", nameof(reason));

            try
            {
                // STEP 2: load incident and supplementary receipt
                var incident = await _context.IncidentReports
                    .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

                if (incident == null)
                    throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

                if (incident.Status != "PendingManagerApproval")
                    throw new InvalidOperationException(
                        $"Cannot reject supplementary receipt for incident {incidentId} with status '{incident.Status}'");

                var supplementaryReceipt = await LoadLatestSupplementaryReceiptForDecisionAsync(incidentId);

                await EnsureLatestSupplementaryRevisionAsync(supplementaryReceipt.SupplementaryReceiptId);

                if (supplementaryReceipt.Status != "PendingManagerApproval")
                    throw new InvalidOperationException(
                        $"Cannot reject supplementary receipt {supplementaryReceipt.SupplementaryReceiptId}. Current status: '{supplementaryReceipt.Status}'");

                // STEP 3: update statuses
                var now = DateTime.UtcNow;
                incident.Status = "PendingPurchasingAction";
                supplementaryReceipt.Status = "Rejected";
                supplementaryReceipt.ApprovedByManagerId = managerId;
                supplementaryReceipt.ApprovedAt = now;

                var rejection = new ReceiptRejectionHistory
                {
                    SupplementaryReceiptId = supplementaryReceipt.SupplementaryReceiptId,
                    RejectedBy = managerId,
                    RejectedAt = now,
                    RejectionReason = reason
                };
                _context.ReceiptRejectionHistories.Add(rejection);
                supplementaryReceipt.RejectionHistories.Add(rejection);

                await _context.SaveChangesAsync();

                // Notify purchasing to revise with supplier (fallback to Admin)
                await CreateRoleNotificationsAsync(
                    "Purchasing",
                    $"Supplementary receipt {supplementaryReceipt.SupplementaryReceiptId} rejected. Reason: {reason}",
                    "SupplementaryReceipt",
                    supplementaryReceipt.SupplementaryReceiptId,
                    fallbackRoleName: "Admin");

                await transaction.CommitAsync();

                return new ManagerSupplementaryRejectResultDto
                {
                    Status = incident.Status
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<SupplementaryReceipt> LoadLatestSupplementaryReceiptForDecisionAsync(long incidentId)
        {
            var supplementaryReceipt = await _context.SupplementaryReceipts
                .Include(s => s.Items)
                .Where(s => s.IncidentId == incidentId)
                .OrderByDescending(s => s.RevisionNumber)
                .ThenByDescending(s => s.SupplementaryReceiptId)
                .FirstOrDefaultAsync();

            if (supplementaryReceipt == null)
                throw new KeyNotFoundException($"Supplementary receipt cho incident {incidentId} không tìm thấy!");

            return supplementaryReceipt;
        }

        private async Task EnsureLatestSupplementaryRevisionAsync(long supplementaryReceiptId)
        {
            var hasChildRevision = await _context.SupplementaryReceipts
                .AnyAsync(s => s.ParentReceiptId == supplementaryReceiptId);

            if (hasChildRevision)
                throw new InvalidOperationException("Chỉ Phiếu bổ sung revision mới nhất mới được phép xử lý");
        }

        // For purchasing view revision history of supplementary receipts for an incident
        public async Task<List<SupplementaryRevisionHistoryItemDto>> GetSupplementaryRevisionHistoryAsync(long supplementaryReceiptId)
        {
            // 1. Lấy toàn bộ chuỗi phiên bản từ Database
            var chain = await LoadSupplementaryRevisionChainAsync(supplementaryReceiptId);

            // 2. Map sang DTO và sắp xếp theo thứ tự Revision từ cũ đến mới (1 -> 2 -> 3)
            return chain
                .OrderBy(s => s.RevisionNumber)
                .Select(s =>
                {
                    // Lấy lý do từ chối mới nhất của phiên bản này (nếu có)
                    var latestRejection = s.RejectionHistories
                        .OrderByDescending(r => r.RejectedAt)
                        .FirstOrDefault();

                    // Ưu tiên lấy FullName, nếu không có thì lấy Username
                    var rejectedBy = latestRejection?.Rejector?.FullName;
                    if (string.IsNullOrWhiteSpace(rejectedBy))
                        rejectedBy = latestRejection?.Rejector?.Username ?? string.Empty;

                    return new SupplementaryRevisionHistoryItemDto
                    {
                        SupplementaryReceiptId = s.SupplementaryReceiptId,
                        RevisionNumber = s.RevisionNumber,
                        Status = s.Status,
                        RejectedBy = rejectedBy,
                        RejectedAt = latestRejection?.RejectedAt,
                        RejectionReason = latestRejection?.RejectionReason,
                        TotalSupplementaryQty = s.Items.Sum(i => i.SupplementaryQuantity),
                        CreatedAt = s.CreatedAt
                    };
                })
                .ToList();
        }

        // Hàm đệ quy đi ngược từ Phiếu hiện tại lên các Phiếu cha
        private async Task<List<SupplementaryReceipt>> LoadSupplementaryRevisionChainAsync(long receiptId)
        {
            var chain = new List<SupplementaryReceipt>();

            var current = await _context.SupplementaryReceipts
                .Include(s => s.Items)
                .Include(s => s.RejectionHistories)
                    .ThenInclude(r => r.Rejector) // Dùng để lấy tên người từ chối
                .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == receiptId);

            if (current == null)
                throw new KeyNotFoundException($"Không tìm thấy Phiếu bổ sung ID {receiptId}");

            // Vòng lặp truy ngược về nguồn cội (Parent)
            while (current != null)
            {
                chain.Add(current);

                // Nếu không có Parent nữa (đây là Rev 1) thì dừng lại
                if (!current.ParentReceiptId.HasValue)
                    break;

                current = await _context.SupplementaryReceipts
                    .Include(s => s.Items)
                    .Include(s => s.RejectionHistories)
                        .ThenInclude(r => r.Rejector)
                    .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == current.ParentReceiptId.Value);
            }

            return chain;
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateRoleNotificationsAsync(
            string roleName,
            string message,
            string entityType,
            long? entityId,
            string? fallbackRoleName = null)
        {
            var userIds = await GetUserIdsByRoleAsync(roleName);
            if (userIds.Count == 0 && !string.IsNullOrWhiteSpace(fallbackRoleName))
                userIds = await GetUserIdsByRoleAsync(fallbackRoleName);

            if (userIds.Count == 0)
                return;

            var now = DateTime.UtcNow;
            foreach (var userId in userIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Message = message,
                    RelatedEntityType = entityType,
                    RelatedEntityId = entityId,
                    IsRead = false,
                    CreatedAt = now
                });
            }

            await _context.SaveChangesAsync();
        }

        private static List<ManagerIncidentItemSummaryDto> MapIncidentItems(IncidentReport incident, bool includeImages = true)
        {
            var evidenceByMaterial = incident.IncidentReportDetails
                .GroupBy(d => d.MaterialId)
                .ToDictionary(
                    g => g.Key,
                    g => g.SelectMany(d => d.EvidenceImages)
                        .Select(i => i.ImageData)
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Distinct()
                        .ToList());

            var qcDetails = incident.QCCheck?.QCCheckDetails ?? new List<QCCheckDetail>();
            var qcByReceiptDetailId = qcDetails
                .GroupBy(d => d.ReceiptDetailId)
                .ToDictionary(g => g.Key, g => g.First());

            var receiptDetails = incident.Receipt?.ReceiptDetails?.ToList()
                ?? qcDetails
                    .Where(d => d.ReceiptDetail != null)
                    .Select(d => d.ReceiptDetail!)
                    .GroupBy(rd => rd.DetailId)
                    .Select(g => g.First())
                    .ToList();

            return receiptDetails.Select(rd =>
            {
                qcByReceiptDetailId.TryGetValue(rd.DetailId, out var qcd);

                return new ManagerIncidentItemSummaryDto
                {
                    MaterialId = rd.MaterialId,
                    MaterialName = rd.Material?.Name,
                    OrderedQuantity = rd.Quantity,
                    ActualQuantity = rd.ActualQuantity,
                    PassQuantity = qcd?.PassQuantity ?? 0,
                    FailQuantity = qcd?.FailQuantity ?? 0,
                    FailReason = qcd?.FailReason,
                    // Include breakdown columns
                    FailQuantityQuantity = qcd?.FailQuantityQuantity,
                    FailQuantityQuality = qcd?.FailQuantityQuality,
                    FailQuantityDamage = qcd?.FailQuantityDamage,
                    EvidenceImages = includeImages && evidenceByMaterial.TryGetValue(rd.MaterialId, out var images)
                    ? images
                    : new List<string>()
                };
            }).ToList();
        }

        private static QCCheckDto MapQCCheckToDto(QCCheck qcCheck, string? receiptCode, string? checkedByName = null)
        {
            return new QCCheckDto
            {
                QCCheckId = qcCheck.QCCheckId,
                QCCheckCode = qcCheck.QCCheckCode,
                ReceiptId = qcCheck.ReceiptId,
                ReceiptCode = receiptCode,
                CheckedBy = qcCheck.CheckedBy,
                CheckedByName = checkedByName,
                CheckedAt = qcCheck.CheckedAt,
                OverallResult = qcCheck.OverallResult,
                Notes = qcCheck.Notes,
                Details = qcCheck.QCCheckDetails.Select(d => new QCCheckDetailDto
                {
                    DetailId = d.DetailId,
                    ReceiptDetailId = d.ReceiptDetailId,
                    MaterialId = d.ReceiptDetail.MaterialId,
                    MaterialCode = d.ReceiptDetail.Material?.Code,
                    MaterialName = d.ReceiptDetail.Material?.Name,
                    Result = d.Result,
                    FailReason = d.FailReason,
                    PassQuantity = d.PassQuantity,
                    FailQuantity = d.FailQuantity
                }).ToList()
            };
        }
    }
}
