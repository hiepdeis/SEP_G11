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
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .Where(i => i.Status == "PendingManagerReview")
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
                Items = MapIncidentItems(i)
            }).ToList();
        }

        public async Task<ManagerIncidentDetailDto> GetManagerIncidentAsync(long incidentId)
        {
            // STEP 1: load incident with QC details
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
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
                : MapQCCheckToDto(incident.QCCheck, incident.Receipt?.ReceiptCode);

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

            await _context.SaveChangesAsync();

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
                        PassQuantity = d.PassQuantity,
                        FailQuantity = d.FailQuantity,
                        FailReason = d.FailReason
                    })
                    .ToList()
            }).ToList();
        }

        public async Task<PurchasingIncidentDetailDto> GetPurchasingIncidentAsync(long incidentId)
        {
            // STEP 1: load incident with QC details
            var incident = await _context.IncidentReports
                .Include(i => i.Receipt)
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
                : MapQCCheckToDto(incident.QCCheck, incident.Receipt?.ReceiptCode);

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
                        PassQuantity = d.PassQuantity,
                        FailQuantity = d.FailQuantity,
                        FailReason = d.FailReason
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

            // STEP 4: create supplementary receipt and update incident status
            var now = DateTime.UtcNow;
            var supplementaryReceipt = new SupplementaryReceipt
            {
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
                .FirstOrDefaultAsync(s => s.IncidentId == incidentId);

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

            var supplementaryReceipt = await _context.SupplementaryReceipts
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.IncidentId == incidentId);

            if (supplementaryReceipt == null)
                throw new KeyNotFoundException($"Supplementary receipt for incident {incidentId} not found");

            if (incident.Receipt.PurchaseOrderId == null)
                throw new InvalidOperationException("Incident receipt is not linked to a purchase order");

            if (!incident.Receipt.WarehouseId.HasValue)
                throw new InvalidOperationException("Incident receipt has no warehouse assigned");

            // STEP 2: apply pass quantities to inventory and warehouse cards
            if (incident.QCCheck == null)
                throw new InvalidOperationException("QC check is required before approving supplementary receipt");

            var today = DateTime.UtcNow;
            decimal totalPassQuantity = 0;
            var cardPrefix = $"WC-{today:yyyyMMdd}-";
            var nextSeq = await GetNextWarehouseCardSequenceAsync(today);

            foreach (var detail in incident.QCCheck.QCCheckDetails)
            {
                var receiptDetail = detail.ReceiptDetail;
                if (!receiptDetail.BinLocationId.HasValue || !receiptDetail.BatchId.HasValue)
                    throw new InvalidOperationException("BinLocationId and BatchId are required to update inventory");

                var inventory = await _context.InventoryCurrents
                    .FirstOrDefaultAsync(i =>
                        i.WarehouseId == incident.Receipt.WarehouseId &&
                        i.MaterialId == receiptDetail.MaterialId &&
                        i.BinId == receiptDetail.BinLocationId &&
                        i.BatchId == receiptDetail.BatchId);

                var qtyBefore = inventory?.QuantityOnHand ?? 0;
                var qtyAfter = qtyBefore + detail.PassQuantity;

                if (inventory == null)
                {
                    inventory = new InventoryCurrent
                    {
                        WarehouseId = incident.Receipt.WarehouseId,
                        MaterialId = receiptDetail.MaterialId,
                        BinId = receiptDetail.BinLocationId.Value,
                        BatchId = receiptDetail.BatchId.Value,
                        QuantityOnHand = detail.PassQuantity,
                        LastUpdated = today
                    };
                    _context.InventoryCurrents.Add(inventory);
                }
                else
                {
                    inventory.QuantityOnHand = qtyAfter;
                    inventory.LastUpdated = today;
                }

                var cardCode = $"{cardPrefix}{nextSeq:D4}";
                nextSeq++;
                var warehouseCard = new WarehouseCard
                {
                    CardCode = cardCode,
                    WarehouseId = incident.Receipt.WarehouseId!.Value,
                    MaterialId = receiptDetail.MaterialId,
                    BinId = receiptDetail.BinLocationId.Value,
                    BatchId = receiptDetail.BatchId.Value,
                    TransactionType = "Import",
                    ReferenceId = incident.ReceiptId,
                    ReferenceType = "Receipt",
                    TransactionDate = today,
                    Quantity = detail.PassQuantity,
                    QuantityBefore = qtyBefore,
                    QuantityAfter = qtyAfter,
                    CreatedBy = managerId,
                    Notes = notes
                };
                _context.WarehouseCards.Add(warehouseCard);

                totalPassQuantity += detail.PassQuantity;
            }

            // STEP 3: transition statuses
            incident.Status = "AwaitingSupplementaryGoods";
            supplementaryReceipt.Status = "Approved";
            supplementaryReceipt.ApprovedByManagerId = managerId;
            supplementaryReceipt.ApprovedAt = today;
            incident.Receipt.Status = "Completed";

            // STEP 4: update PO status based on pass quantity
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == incident.Receipt.PurchaseOrderId.Value);

            if (purchaseOrder == null)
                throw new KeyNotFoundException("Purchase order not found for incident receipt");

            var totalOrdered = purchaseOrder.Items.Sum(i => i.OrderedQuantity);
            string poStatus;

            if (totalPassQuantity == totalOrdered)
                poStatus = purchaseOrder.Status = "FullyReceived";
            else if (totalPassQuantity < totalOrdered)
                poStatus = purchaseOrder.Status = "PartiallyReceived";
            else
                poStatus = purchaseOrder.Status = "OverReceived";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Notify staff to wait for supplementary goods
            await CreateRoleNotificationsAsync(
                "Staff",
                $"Supplementary receipt {supplementaryReceipt.SupplementaryReceiptId} approved. Await replacement goods.",
                "SupplementaryReceipt",
                supplementaryReceipt.SupplementaryReceiptId);

            await CreateRoleNotificationsAsync(
                "Accountant",
                $"Receipt {incident.Receipt?.ReceiptCode ?? incident.ReceiptId.ToString()} completed and awaiting accounting close.",
                "Receipt",
                incident.ReceiptId);

            var supplementaryQuantityPending = supplementaryReceipt.Items.Sum(i => i.SupplementaryQuantity);

            return new ManagerSupplementaryApprovalResultDto
            {
                IncidentId = incidentId,
                PassQuantityAdded = totalPassQuantity,
                SupplementaryQuantityPending = supplementaryQuantityPending,
                PoStatus = poStatus,
                NextStep = "Staff uses POST /api/staff/receipts/from-po with supplementaryReceiptId"
            };
        }

        public async Task<ManagerSupplementaryRejectResultDto> RejectSupplementaryReceiptAsync(
            long incidentId,
            int managerId,
            string reason)
        {
            // STEP 1: validate input
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Reason is required", nameof(reason));

            // STEP 2: load incident and supplementary receipt
            var incident = await _context.IncidentReports
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
                throw new KeyNotFoundException($"Incident with ID {incidentId} not found");

            if (incident.Status != "PendingManagerApproval")
                throw new InvalidOperationException(
                    $"Cannot reject supplementary receipt for incident {incidentId} with status '{incident.Status}'");

            var supplementaryReceipt = await _context.SupplementaryReceipts
                .FirstOrDefaultAsync(s => s.IncidentId == incidentId);

            if (supplementaryReceipt == null)
                throw new KeyNotFoundException($"Supplementary receipt for incident {incidentId} not found");

            // STEP 3: update statuses
            incident.Status = "PendingPurchasingAction";
            supplementaryReceipt.Status = "Rejected";

            await _context.SaveChangesAsync();

            // Notify purchasing to revise with supplier (fallback to Admin)
            await CreateRoleNotificationsAsync(
                "Purchasing",
                $"Supplementary receipt {supplementaryReceipt.SupplementaryReceiptId} rejected. Reason: {reason}",
                "SupplementaryReceipt",
                supplementaryReceipt.SupplementaryReceiptId,
                fallbackRoleName: "Admin");

            return new ManagerSupplementaryRejectResultDto
            {
                Status = incident.Status
            };
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

        private async Task<int> GetNextWarehouseCardSequenceAsync(DateTime today)
        {
            var prefix = $"WC-{today:yyyyMMdd}-";
            var lastCard = await _context.WarehouseCards
                .Where(w => w.CardCode.StartsWith(prefix))
                .OrderByDescending(w => w.CardId)
                .FirstOrDefaultAsync();

            var nextSeq = 1;
            if (lastCard != null)
            {
                var parts = lastCard.CardCode.Split('-');
                if (parts.Length > 0 && int.TryParse(parts[^1], out var lastSeq))
                    nextSeq = lastSeq + 1;
            }

            return nextSeq;
        }

        private static List<ManagerIncidentItemSummaryDto> MapIncidentItems(IncidentReport incident)
        {
            var details = incident.QCCheck?.QCCheckDetails ?? new List<QCCheckDetail>();

            return details.Select(d => new ManagerIncidentItemSummaryDto
            {
                MaterialId = d.ReceiptDetail.MaterialId,
                MaterialName = d.ReceiptDetail.Material?.Name,
                PassQuantity = d.PassQuantity,
                FailQuantity = d.FailQuantity,
                FailReason = d.FailReason
            }).ToList();
        }

        private static QCCheckDto MapQCCheckToDto(QCCheck qcCheck, string? receiptCode)
        {
            return new QCCheckDto
            {
                QCCheckId = qcCheck.QCCheckId,
                QCCheckCode = qcCheck.QCCheckCode,
                ReceiptId = qcCheck.ReceiptId,
                ReceiptCode = receiptCode,
                CheckedBy = qcCheck.CheckedBy,
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
