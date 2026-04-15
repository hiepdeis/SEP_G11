#

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

###

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

###

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

###

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

##

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

###

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

        private static List<ManagerIncidentItemSummaryDto> MapIncidentItems(IncidentReport incident)
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
                    EvidenceImages = evidenceByMaterial.TryGetValue(rd.MaterialId, out var images)
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

###

        public async Task<List<PurchaseOrder>> CreateDraftsAsync(long requestId, int purchasingId, CreatePurchaseOrderDraftDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Items list cannot be empty", nameof(dto.Items));

            var groupedItems = dto.Items
                .Select(i => new
                {
                    SupplierId = i.SupplierId ?? dto.SupplierId,
                    Item = i
                })
                .ToList();

            if (groupedItems.Any(x => !x.SupplierId.HasValue))
                throw new ArgumentException("SupplierId is required for all items.");

            PurchaseOrder? parentPo = null;
            if (dto.ParentPOId.HasValue)
            {
                if (groupedItems.Select(i => i.SupplierId!.Value).Distinct().Count() > 1)
                    throw new InvalidOperationException("Revision PO chi cho phep 1 nha cung cap");

                var supplierId = groupedItems.First().SupplierId!.Value;
                parentPo = await LoadParentPurchaseOrderForRevisionAsync(dto.ParentPOId.Value, requestId, supplierId);
            }

            var orders = new List<PurchaseOrder>();

            foreach (var group in groupedItems.GroupBy(x => x.SupplierId!.Value))
            {
                var items = group.Select(i => new PurchaseOrderItem
                {
                    MaterialId = i.Item.MaterialId,
                    OrderedQuantity = i.Item.OrderedQuantity,
                    UnitPrice = i.Item.UnitPrice
                }).ToList();

                var order = await CreateDraftAsync(requestId, purchasingId, group.Key, items, parentPo, dto.RevisionNote);
                orders.Add(order);
            }

            return orders;
        }

        public async Task<PurchaseOrder> CreateDraftAsync(
            long requestId,
            int purchasingId,
            int supplierId,
            List<PurchaseOrderItem> items,
            PurchaseOrder? parentPo = null,
            string? revisionNote = null)
        {
            if (items == null || items.Count == 0)
                throw new ArgumentException("Items list cannot be empty", nameof(items));

            var request = await _context.PurchaseRequests
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var supplier = await _context.Suppliers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SupplierId == supplierId);

            if (supplier == null)
                throw new KeyNotFoundException($"Supplier with ID {supplierId} not found");

            var now = DateTime.UtcNow;
            var hasValidContract = await _context.SupplierContracts.AnyAsync(c =>
                c.SupplierId == supplierId &&
                c.Status == "Active" &&
                c.EffectiveFrom <= now &&
                (c.EffectiveTo == null || c.EffectiveTo >= now));

            if (!hasValidContract)
                throw new InvalidOperationException("Supplier contract is not valid or not active");

            var materialIds = items.Select(i => i.MaterialId).Distinct().ToList();

            var materialMap = await _context.Materials
                .Where(m => materialIds.Contains(m.MaterialId))
                .ToDictionaryAsync(m => m.MaterialId, m => m.Name);

            var activeQuotationMaterialIds = await _context.SupplierQuotations
                .Where(q => q.SupplierId == supplierId)
                .Where(q => q.IsActive == true)
                .Where(q => q.ValidFrom == null || q.ValidFrom <= now)
                .Where(q => q.ValidTo == null || q.ValidTo >= now)
                .Select(q => q.MaterialId)
                .Distinct()
                .ToListAsync();

            var activeQuotationSet = activeQuotationMaterialIds.ToHashSet();

            foreach (var item in items)
            {
                if (item.OrderedQuantity <= 0)
                    throw new ArgumentException("Item quantity must be greater than 0");

                if (!item.UnitPrice.HasValue || item.UnitPrice.Value <= 0)
                    throw new ArgumentException("UnitPrice must be greater than 0");

                if (!activeQuotationSet.Contains(item.MaterialId))
                {
                    var materialName = materialMap.TryGetValue(item.MaterialId, out var name)
                        ? name
                        : $"Material {item.MaterialId}";

                    throw new InvalidOperationException(
                        $"Không tìm thấy báo giá active của {supplier.Name} cho {materialName}");
                }
            }

            // Prevent duplicate drafts for the same request and supplier.
            var hasDraft = await _context.PurchaseOrders
                .Where(o => o.RequestId == requestId)
                .Where(o => o.SupplierId == supplierId)
                .Where(o => o.Status == "Draft")
                .AnyAsync();

            if (hasDraft)
                throw new InvalidOperationException(
                    $"Draft PO already exists for request {requestId} and supplier {supplierId}");

            if (parentPo != null)
            {
                var hasChildRevision = await _context.PurchaseOrders
                    .AnyAsync(o => o.ParentPOId == parentPo.PurchaseOrderId);

                if (hasChildRevision)
                    throw new InvalidOperationException("PO da co revision moi hon");
            }

            var poCode = await GeneratePurchaseOrderCodeAsync();

            var newItems = items.Select(i => new PurchaseOrderItem
            {
                MaterialId = i.MaterialId,
                SupplierId = supplierId,
                OrderedQuantity = i.OrderedQuantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.OrderedQuantity * (i.UnitPrice ?? 0)
            }).ToList();

            var totalAmount = newItems.Sum(i => i.LineTotal ?? 0);

            var purchaseOrder = new PurchaseOrder
            {
                PurchaseOrderCode = poCode,
                RequestId = requestId,
                ProjectId = request.ProjectId,
                SupplierId = supplierId,
                CreatedBy = purchasingId,
                CreatedAt = now,
                Status = "Draft",
                TotalAmount = totalAmount,
                ParentPOId = parentPo?.PurchaseOrderId,
                RevisionNumber = parentPo == null ? 1 : parentPo.RevisionNumber + 1,
                RevisionNote = revisionNote,
                Items = newItems
            };

            _context.PurchaseOrders.Add(purchaseOrder);

            request.Status = "DraftPO";

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<List<PurchaseOrder>> GetOrdersAsync()
        {
            var query = ActivePOsOnly(_context.PurchaseOrders)
                .Include(o => o.RejectionHistories)
                .Include(o => o.Project)
                .Include(o => o.Supplier)
                .Include(o => o.PurchaseRequest)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .OrderByDescending(o => o.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            return await query;
        }

        public async Task<PurchaseOrder?> GetOrderAsync(long purchaseOrderId)
        {
            return await _context.PurchaseOrders
                .Include(o => o.RejectionHistories)
                .Include(o => o.Project)
                .Include(o => o.Supplier)
                .Include(o => o.PurchaseRequest)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);
        }

        public async Task<PurchaseOrder> AccountantApproveAsync(long purchaseOrderId, int accountantId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "Draft")
                throw new InvalidOperationException(
                    $"Cannot approve PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            if (purchaseOrder.Items.Count == 0)
                throw new InvalidOperationException("Cannot approve PO without items");

            var priceReview = await ReviewPriceAsync(purchaseOrderId);

            if (priceReview.Any(r => r.PoUnitPrice > r.QuotationPrice))
            {
                throw new InvalidOperationException("One or more items exceed the reference quotation price");
            }

            purchaseOrder.TotalAmount = purchaseOrder.Items.Sum(i => i.OrderedQuantity * (i.UnitPrice ?? 0));

            await EnsureBudgetAvailableAsync(purchaseOrder.ProjectId, purchaseOrder.TotalAmount ?? 0, purchaseOrder.PurchaseOrderId);

            purchaseOrder.Status = "AccountantApproved";
            purchaseOrder.AccountantApprovedBy = accountantId;
            purchaseOrder.AccountantApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AccountantRejectAsync(long purchaseOrderId, int accountantId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Rejection reason is required", nameof(reason));

            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "Draft")
                throw new InvalidOperationException(
                    $"Cannot reject PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AccountantRejected";
            purchaseOrder.AccountantApprovedBy = accountantId;
            purchaseOrder.AccountantApprovedAt = DateTime.UtcNow;

            var rejection = new ReceiptRejectionHistory
            {
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                RejectedBy = accountantId,
                RejectedAt = DateTime.UtcNow,
                RejectionReason = reason
            };
            _context.ReceiptRejectionHistories.Add(rejection);
            purchaseOrder.RejectionHistories.Add(rejection);

            await _context.SaveChangesAsync();

            var message = $"PO {purchaseOrder.PurchaseOrderCode} bi ke toan tu choi: {reason}";
            await CreateRoleNotificationsAsync("Purchasing", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AdminApproveAsync(long purchaseOrderId, int adminId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AccountantApproved")
                throw new InvalidOperationException(
                    $"Cannot approve PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AdminApproved";
            purchaseOrder.AdminApprovedBy = adminId;
            purchaseOrder.AdminApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AdminRejectAsync(long purchaseOrderId, int adminId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Rejection reason is required", nameof(reason));

            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AccountantApproved")
                throw new InvalidOperationException(
                    $"Cannot reject PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AdminRejected";
            purchaseOrder.AdminApprovedBy = adminId;
            purchaseOrder.AdminApprovedAt = DateTime.UtcNow;


            var rejection = new ReceiptRejectionHistory
            {
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                RejectedBy = adminId,
                RejectedAt = DateTime.UtcNow,
                RejectionReason = reason
            };
            _context.ReceiptRejectionHistories.Add(rejection);
            purchaseOrder.RejectionHistories.Add(rejection);

            await _context.SaveChangesAsync();

            var message = $"PO {purchaseOrder.PurchaseOrderCode} bi admin tu choi: {reason}";
            await CreateRoleNotificationsAsync("Purchasing", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<List<PriceReviewItemDto>> ReviewPriceAsync(long purchaseOrderId)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            var referencePrices = await GetReferencePricesAsync(purchaseOrder.SupplierId);
            var results = new List<PriceReviewItemDto>();

            foreach (var item in purchaseOrder.Items)
            {
                if (!item.UnitPrice.HasValue || item.UnitPrice.Value <= 0)
                    throw new InvalidOperationException("UnitPrice must be greater than 0 for all items");

                if (!referencePrices.TryGetValue(item.MaterialId, out var referencePrice))
                    throw new InvalidOperationException(
                        $"No active quotation found for material {item.MaterialId} and supplier {purchaseOrder.SupplierId}");

                var variance = item.UnitPrice.Value - referencePrice;
                var variancePercent = referencePrice == 0
                    ? (decimal?)null
                    : variance / referencePrice * 100;

                results.Add(new PriceReviewItemDto
                {
                    MaterialName = item.Material?.Name ?? string.Empty,
                    PoUnitPrice = item.UnitPrice.Value,
                    QuotationPrice = referencePrice,
                    Variance = variance,
                    VariancePercent = variancePercent
                });
            }

            return results;
        }

        public async Task<long> GetLatestRevisionIdAsync(long purchaseOrderId)
        {
            var exists = await _context.PurchaseOrders
                .AnyAsync(p => p.PurchaseOrderId == purchaseOrderId);

            if (!exists)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            var currentId = purchaseOrderId;
            while (true)
            {
                var nextId = await _context.PurchaseOrders
                    .Where(p => p.ParentPOId == currentId)
                    .OrderByDescending(p => p.RevisionNumber)
                    .Select(p => (long?)p.PurchaseOrderId)
                    .FirstOrDefaultAsync();

                if (!nextId.HasValue)
                    return currentId;

                currentId = nextId.Value;
            }
        }

        public async Task<PurchaseOrder> SendToSupplierAsync(long purchaseOrderId, int purchasingId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AdminApproved")
                throw new InvalidOperationException(
                    $"Cannot send PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "SentToSupplier";
            purchaseOrder.SentToSupplierAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "PO {PurchaseOrderId} sent to supplier by user {PurchasingId}",
                purchaseOrderId,
                purchasingId);

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> ConfirmDeliveryAsync(long purchaseOrderId, DateTime expectedDeliveryDate, string? supplierNote)
        {
            if (expectedDeliveryDate == default)
                throw new ArgumentException("ExpectedDeliveryDate is required", nameof(expectedDeliveryDate));

            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            if (purchaseOrder.Status != "SentToSupplier")
                throw new InvalidOperationException(
                    $"Cannot confirm delivery for PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.ExpectedDeliveryDate = expectedDeliveryDate;
            purchaseOrder.SupplierNote = supplierNote;

            await _context.SaveChangesAsync();

            var supplierName = purchaseOrder.Supplier?.Name ?? "N/A";
            var itemSummary = string.Join(
                "; ",
                purchaseOrder.Items.Select(i =>
                {
                    var materialName = i.Material?.Name ?? $"Material {i.MaterialId}";
                    var unit = i.Material?.Unit ?? string.Empty;
                    return $"{materialName} — {i.OrderedQuantity} {unit}".Trim();
                }));

            var message =
                $"PO {purchaseOrder.PurchaseOrderCode} du kien ve luc {expectedDeliveryDate:yyyy-MM-dd HH:mm}. " +
                $"NCC: {supplierName}. Mat hang: {itemSummary}";

            await CreateRoleNotificationsAsync("Staff", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);
            await CreateRoleNotificationsAsync("Manager", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<List<PurchaseOrderRevisionHistoryItemDto>> GetRevisionHistoryAsync(long purchaseOrderId)
        {
            var chain = await LoadRevisionChainAsync(purchaseOrderId);

            return chain
                .OrderBy(o => o.RevisionNumber)
                .Select(o =>
                {
                    var latestRejection = o.RejectionHistories
                        .OrderByDescending(r => r.RejectedAt)
                        .FirstOrDefault();

                    var rejectedBy = latestRejection?.Rejector?.FullName;
                    if (string.IsNullOrWhiteSpace(rejectedBy))
                        rejectedBy = latestRejection?.Rejector?.Username ?? string.Empty;

                    return new PurchaseOrderRevisionHistoryItemDto
                    {
                        PoId = o.PurchaseOrderId,
                        RevisionNumber = o.RevisionNumber,
                        Status = o.Status,
                        RejectedBy = rejectedBy ?? string.Empty,
                        RejectedAt = latestRejection?.RejectedAt,
                        RejectionReason = latestRejection?.RejectionReason,
                        TotalAmount = o.TotalAmount
                    };
                })
                .ToList();
        }

        public async Task<PurchaseOrderHistoryResponseDto> GetPurchaseOrderHistoryAsync(long requestId)
        {
            var request = await _context.PurchaseRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var orders = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.RejectionHistories)
                    .ThenInclude(r => r.Rejector)
                .Where(o => o.RequestId == requestId)
                .OrderBy(o => o.RevisionNumber)
                .ThenBy(o => o.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            var chain = orders.Select(o =>
            {
                var latestRejection = o.RejectionHistories
                    .OrderByDescending(r => r.RejectedAt)
                    .FirstOrDefault();

                return new PurchaseOrderHistoryItemDto
                {
                    PoId = o.PurchaseOrderId,
                    RevisionNumber = o.RevisionNumber,
                    SupplierName = o.Supplier?.Name ?? string.Empty,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status,
                    RejectionReason = latestRejection?.RejectionReason,
                    RevisionNote = o.RevisionNote,
                    CreatedAt = o.CreatedAt
                };
            }).ToList();

            return new PurchaseOrderHistoryResponseDto
            {
                RequestId = requestId,
                PrStatus = request.Status,
                PoChain = chain
            };
        }

        private async Task<string> GeneratePurchaseOrderCodeAsync()
        {
            var today = DateTime.UtcNow;
            var prefix = $"PO{today:yyyyMMdd}";

            var count = await _context.PurchaseOrders
                .CountAsync(p => p.PurchaseOrderCode.StartsWith(prefix));

            return $"{prefix}-{(count + 1):D4}";
        }

        private async Task<PurchaseOrder> LoadPurchaseOrderForUpdateAsync(long purchaseOrderId)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                .Include(o => o.PurchaseRequest)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            return purchaseOrder;
        }

        private IQueryable<PurchaseOrder> ActivePOsOnly(IQueryable<PurchaseOrder> query)
        {
            var replacedIds = _context.PurchaseOrders
                .Where(p => p.ParentPOId != null)
                .Select(p => p.ParentPOId!.Value);

            return query.Where(p => !replacedIds.Contains(p.PurchaseOrderId));
        }

        private async Task EnsureLatestRevisionAsync(long purchaseOrderId)
        {
            var hasChild = await _context.PurchaseOrders
                .AnyAsync(o => o.ParentPOId == purchaseOrderId);

            if (hasChild)
                throw new InvalidOperationException("Chi PO revision moi nhat moi duoc xu ly");
        }

        private async Task<PurchaseOrder> LoadParentPurchaseOrderForRevisionAsync(long parentPoId, long requestId, int supplierId)
        {
            var parentPo = await _context.PurchaseOrders
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == parentPoId);

            if (parentPo == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {parentPoId} not found");

            if (parentPo.Status != "AccountantRejected" && parentPo.Status != "AdminRejected")
                throw new InvalidOperationException("Chi tao revision tu PO da bi reject");

            if (parentPo.RequestId != requestId)
                throw new InvalidOperationException("Parent PO khong cung PR voi requestId");

            // if (parentPo.SupplierId != supplierId)
            //     throw new InvalidOperationException("Parent PO khong cung nha cung cap");

            return parentPo;
        }

        private async Task<List<PurchaseOrder>> LoadRevisionChainAsync(long purchaseOrderId)
        {
            var chain = new List<PurchaseOrder>();

            var current = await _context.PurchaseOrders
                .Include(o => o.RejectionHistories)
                    .ThenInclude(r => r.Rejector)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (current == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            while (current != null)
            {
                chain.Add(current);

                if (!current.ParentPOId.HasValue)
                    break;

                current = await _context.PurchaseOrders
                    .Include(o => o.RejectionHistories)
                        .ThenInclude(r => r.Rejector)
                    .FirstOrDefaultAsync(o => o.PurchaseOrderId == current.ParentPOId.Value);
            }

            return chain;
        }

        private async Task<Dictionary<int, decimal>> GetReferencePricesAsync(int supplierId)
        {
            var now = DateTime.UtcNow;

            return await _context.SupplierQuotations
                .Where(q => q.SupplierId == supplierId)
                .Where(q => q.IsActive == true)
                .Where(q => q.ValidFrom == null || q.ValidFrom <= now)
                .Where(q => q.ValidTo == null || q.ValidTo >= now)
                .GroupBy(q => q.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    Price = g.OrderByDescending(q => q.ValidFrom ?? DateTime.MinValue).First().Price
                })
                .ToDictionaryAsync(x => x.MaterialId, x => x.Price);
        }

        private async Task EnsureBudgetAvailableAsync(int projectId, decimal currentPoAmount, long purchaseOrderId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
                throw new KeyNotFoundException($"Project with ID {projectId} not found");

            if (!project.Budget.HasValue)
                throw new InvalidOperationException("Project budget is not set");

            var countedStatuses = new[]
            {
                "AccountantApproved",
                "AdminApproved",
                "SentToSupplier",
                "GoodsReceived",
                "FullyReceived",
                "PartiallyReceived",
                "OverReceived"
            };

            var approvedTotal = await _context.PurchaseOrders
                .Where(p => p.ProjectId == projectId)
                .Where(p => p.PurchaseOrderId != purchaseOrderId)
                .Where(p => countedStatuses.Contains(p.Status))
                .SumAsync(p => p.TotalAmount ?? 0);

            var remaining = project.Budget.Value - approvedTotal;
            if (currentPoAmount > remaining)
                throw new InvalidOperationException(
                    $"Project budget exceeded. Remaining: {remaining}, current PO: {currentPoAmount}");
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateRoleNotificationsAsync(string roleName, string message, string entityType, long? entityId)
        {
            var userIds = await GetUserIdsByRoleAsync(roleName);
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

###

        public async Task<PurchaseRequest> CreateRequestFromAlertAsync(long alertId, int adminId, int projectId, List<PurchaseRequestItem> items)
        {
            if (items == null)
                items = new List<PurchaseRequestItem>();

            var alert = await _context.StockShortageAlerts
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null)
                throw new KeyNotFoundException($"Alert with ID {alertId} not found");

            if (alert.Status == "PRCreated")
                throw new InvalidOperationException("PR da duoc tao cho Alert nay roi");

            if (alert.Status != "ManagerConfirmed")
                throw new InvalidOperationException(
                    $"Alert {alertId} must be ManagerConfirmed before creating PR. Current status: {alert.Status}");

            var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
            if (!projectExists)
                throw new KeyNotFoundException($"Project with ID {projectId} not found");

            if (items.Count == 0)
            {
                var quantity = alert.SuggestedQuantity;
                if (!quantity.HasValue || quantity.Value <= 0)
                    throw new ArgumentException("Quantity must be greater than 0");

                items.Add(new PurchaseRequestItem
                {
                    MaterialId = alert.MaterialId,
                    Quantity = quantity.Value
                });
            }

            foreach (var item in items)
            {
                if (item.Quantity <= 0)
                    throw new ArgumentException("Item quantity must be greater than 0");
            }

            var requestCode = await GenerateRequestCodeAsync();
            var now = DateTime.UtcNow;

            var request = new PurchaseRequest
            {
                RequestCode = requestCode,
                ProjectId = projectId,
                AlertId = alertId,
                CreatedBy = adminId,
                CreatedAt = now,
                Status = "Submitted",
                Items = items.Select(i => new PurchaseRequestItem
                {
                    MaterialId = i.MaterialId,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList()
            };

            _context.PurchaseRequests.Add(request);

            alert.Status = "PRCreated";

            await _context.SaveChangesAsync();

            return request;
        }

        // For admin want to view all purchase requests
        public async Task<List<PurchaseRequest>> GetRequestsAsync()
        {
            return await _context.PurchaseRequests
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<PurchaseRequest>> GetPendingRequestsAsync()
        {
            // var rejectedStatuses = new[] { "AdminRejected", "AccountantRejected" };

            return await _context.PurchaseRequests
                .Include(r => r.PurchaseOrders)
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .Where(r => r.Status == "Submitted" || r.Status == "DraftPO")
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<PurchaseRequest?> GetRequestAsync(long requestId)
        {
            return await _context.PurchaseRequests
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RequestId == requestId);
        }

        public async Task<PurchaseRequest> UpdateStatusAsync(long requestId, string status)
        {
            if (string.IsNullOrWhiteSpace(status))
                throw new ArgumentException("Status is required", nameof(status));

            var request = await _context.PurchaseRequests
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var oldStatus = request.Status;
            request.Status = status;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "PurchaseRequest {RequestId} status changed from {OldStatus} to {NewStatus}",
                requestId,
                oldStatus,
                status);

            return request;
        }

        private async Task<string> GenerateRequestCodeAsync()
        {
            var today = DateTime.UtcNow;
            var prefix = $"PR{today:yyyyMMdd}";

            var count = await _context.PurchaseRequests
                .CountAsync(r => r.RequestCode.StartsWith(prefix));

            return $"{prefix}-{(count + 1):D4}";
        }

###

        #region Warehouse Staff Methods

        public async Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync()
        {
            var receipts = await _context.Receipts
                           .Include(r => r.Warehouse)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Material)
                                        .Include(r => r.CreatedByNavigation)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Supplier)
                            .Include(r => r.IncidentReports)
                                                        .Where(r => r.Status == "GoodsArrived" ||
                                                            r.Status == "PendingQC" ||
                                                         r.Status == "PendingIncident" ||
                                                         r.Status == "PendingManagerReview" ||
                                                             //r.Status == "QCPassed" ||
                                                             r.Status == "PartiallyPutaway" || r.Status == "ReadyForStamp" ||
                                                             r.Status == "Stamped" || r.Status == "Closed" ||
                                                             r.IncidentReports.Any(i => i.Status == "PendingManagerReview"))
                            .OrderByDescending(r => r.ApprovedAt)
                            .Select(r => new GetInboundRequestListDto
                            {
                                ReceiptId = r.ReceiptId,
                                ReceiptCode = r.ReceiptCode,
                                WarehouseId = r.WarehouseId,
                                WarehouseName = r.Warehouse != null ? r.Warehouse.Name : string.Empty,
                                ReceiptApprovalDate = r.ApprovedAt,
                                TotalQuantity = r.ReceiptDetails.Sum(rd => rd.Quantity),
                                Status = r.Status,
                                CreatedDate = r.ReceiptDate,
                                PurchaseOrderCode = r.PurchaseOrder != null ? r.PurchaseOrder.PurchaseOrderCode : null,
                                Items = r.ReceiptDetails.Select(rd => new GetInboundRequestItemDto
                                {
                                    DetailId = rd.DetailId,
                                    MaterialId = rd.MaterialId,
                                    MaterialCode = rd.Material != null ? rd.Material.Code : "",
                                    MaterialName = rd.Material != null ? rd.Material.Name : "",
                                    Quantity = rd.Quantity,
                                    UnitPrice = rd.UnitPrice,
                                    SupplierName = rd.Supplier != null ? rd.Supplier.Name : "",
                                    SupplierId = rd.SupplierId,
                                    LineTotal = rd.Quantity * (rd.UnitPrice ?? 0),
                                    PassQuantity = rd.QCCheckDetails.Sum(q => q.PassQuantity),
                                }).ToList()
                            }).ToListAsync();
            return receipts;
        }

        public async Task<GetInboundRequestListDto> GetReceiptDetailForWarehouseAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                                        .Include(r => r.Warehouse)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Material)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Supplier)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.BinLocation)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Batch)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.QCCheckDetails)
                                        .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);
            if (receipt == null)
            {
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");
            }

            var userMap = await BuildUserNameMapAsync(
                receipt.SubmittedBy,
                receipt.ApprovedBy,
                receipt.ConfirmedBy);

            return new GetInboundRequestListDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                WarehouseId = receipt.WarehouseId,
                WarehouseName = receipt.Warehouse != null ? receipt.Warehouse.Name : string.Empty,
                ReceiptApprovalDate = receipt.ApprovedAt,
                TotalQuantity = receipt.ReceiptDetails.Sum(rd => rd.Quantity),
                CreatedByName = receipt.CreatedByNavigation != null
                                ? receipt.CreatedByNavigation.FullName ?? receipt.CreatedByNavigation.Email
                                : "Unknown",
                CreatedDate = receipt.ReceiptDate,
                SubmittedByName = ResolveUserName(userMap, receipt.SubmittedBy),
                SubmittedDate = receipt.SubmittedAt,
                ApprovedByName = ResolveUserName(userMap, receipt.ApprovedBy),
                ApprovedDate = receipt.ApprovedAt,
                RejectedByName = ResolveUserName(userMap, receipt.RejectedBy),
                RejectedDate = receipt.RejectedAt,
                ConfirmedByName = ResolveUserName(userMap, receipt.ConfirmedBy),
                ConfirmedDate = receipt.ConfirmedAt,
                Status = receipt.Status,
                ClosedAt = receipt.ClosedAt,
                ClosedByName = null,
                StampedAt = receipt.StampedAt,
                StampedByName = null,
                Items = receipt.ReceiptDetails.Select(rd => new GetInboundRequestItemDto
                {
                    DetailId = rd.DetailId,
                    MaterialId = rd.MaterialId,
                    MaterialCode = rd.Material != null ? rd.Material.Code : "",
                    MaterialName = rd.Material != null ? rd.Material.Name : "",
                    PassQuantity = rd.QCCheckDetails.Sum(q => q.PassQuantity),
                    // Fail nay la fail tong = Actual - Pass
                    FailQuantity = rd.QCCheckDetails.Sum(q => q.FailQuantity),
                    // Fail Claim Quantity là số lượng được claim = |Ordered - Pass| => Lấy cái này
                    FailClaimQuantity = rd.QCCheckDetails.Sum(q => q.FailQuantityQuantity) ?? 0,
                    Quantity = rd.Quantity,
                    ActualQuantity = rd.ActualQuantity,
                    UnitPrice = rd.UnitPrice,
                    SupplierName = rd.Supplier?.Name ?? "",
                    SupplierId = rd.SupplierId,
                    LineTotal = rd.Quantity * (rd.UnitPrice ?? 0),
                    BinLocationId = rd.BinLocation != null ? rd.BinLocation.BinId : null,
                    BinCode = rd.BinLocation?.Code,
                    BatchId = rd.Batch != null ? rd.Batch.BatchId : null,
                    BatchCode = rd.Batch?.BatchCode,
                    MfgDate = rd.Batch?.MfgDate,
                    Unit = rd.Material?.Unit,
                    IsDecimalUnit = rd.Material?.IsDecimalUnit
                }).ToList()
            };
        }

        public async Task ConfirmGoodsReceiptAsync(long receiptId, ConfirmGoodsReceiptDto dto, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // STEP 1: validate receipt and inputs
                var receipt = await _context.Receipts
                    .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                    .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

                if (receipt == null)
                    throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

                if (receipt.Status != "GoodsArrived")
                    throw new InvalidOperationException("Receipt must be approved before confirmation");

                if (receipt.Status == "Completed")
                    throw new InvalidOperationException("Receipt has already been confirmed");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("Items list cannot be empty");

                // STEP 2: CardCode prefix
                var today = DateTime.UtcNow;
                var cardPrefix = $"WC-{today:yyyyMMdd}-";
                var lastCard = await _context.WarehouseCards
                    .Where(w => w.CardCode.StartsWith(cardPrefix))
                    .OrderByDescending(w => w.CardId)
                    .FirstOrDefaultAsync();

                int nextSeq = 1;
                if (lastCard != null)
                {
                    var parts = lastCard.CardCode.Split('-');
                    if (parts.Length > 0 && int.TryParse(parts[^1], out int lastSeq))
                        nextSeq = lastSeq + 1;
                }

                var shortageList = new List<(int MaterialId, int? SupplierId, decimal ShortageQuantity, decimal? UnitPrice)>();

                foreach (var item in dto.Items)
                {
                    var detail = receipt.ReceiptDetails.First(rd => rd.DetailId == item.DetailId);

                    // Update ReceiptDetail
                    detail.ActualQuantity = item.ActualQuantity;
                    detail.BinLocationId = item.BinLocationId;

                    // Handle Batch
                    var batch = await GetOrCreateBatchAsync(detail.MaterialId, item.BatchCode, item.MfgDate, item.CertificateImage);
                    detail.BatchId = batch.BatchId;

                    // Update Inventory (skip if ActualQuantity = 0)
                    if (item.ActualQuantity > 0)
                    {
                        var inventory = await _context.InventoryCurrents
                            .FirstOrDefaultAsync(i =>
                                i.WarehouseId == receipt.WarehouseId &&
                                i.MaterialId == detail.MaterialId &&
                                i.BinId == item.BinLocationId &&
                                i.BatchId == batch.BatchId);

                        decimal qtyBefore = inventory?.QuantityOnHand ?? 0;
                        decimal qtyAfter = qtyBefore + item.ActualQuantity;

                        if (inventory == null)
                        {
                            inventory = new InventoryCurrent
                            {
                                WarehouseId = receipt.WarehouseId,
                                MaterialId = detail.MaterialId,
                                BinId = item.BinLocationId,
                                BatchId = batch.BatchId,
                                QuantityOnHand = item.ActualQuantity,
                                LastUpdated = today
                            };
                            _context.InventoryCurrents.Add(inventory);
                        }
                        else
                        {
                            inventory.QuantityOnHand = qtyAfter;
                            inventory.LastUpdated = today;
                        }

                        // Warehouse Card entry
                        var cardCode = $"{cardPrefix}{nextSeq:D4}";
                        nextSeq++;

                        var warehouseCard = new WarehouseCard
                        {
                            CardCode = cardCode,
                            WarehouseId = receipt.WarehouseId!.Value,
                            MaterialId = detail.MaterialId,
                            BinId = item.BinLocationId,
                            BatchId = batch.BatchId,
                            TransactionType = "Import",
                            ReferenceId = receiptId,
                            ReferenceType = "Receipt",
                            TransactionDate = today,
                            Quantity = item.ActualQuantity,
                            QuantityBefore = qtyBefore,
                            QuantityAfter = qtyAfter,
                            CreatedBy = staffId,
                            Notes = dto.Notes
                        };
                        _context.WarehouseCards.Add(warehouseCard);
                        //
                    }

                    // Check shortage
                    if (item.ActualQuantity < detail.Quantity)
                    {
                        shortageList.Add((
                            detail.MaterialId,
                            detail.SupplierId,
                            detail.Quantity - item.ActualQuantity,
                            detail.UnitPrice
                        ));
                    }
                }

                // STEP 3: Process shortage - create child receipt if there is any shortage
                if (shortageList.Any())
                {
                    var newReceiptCode = await GenerateReceiptCodeAsync();

                    var childReceipt = new Receipt
                    {
                        ReceiptCode = newReceiptCode,
                        ParentRequestId = receiptId,
                        Status = "Backorder",
                        WarehouseId = receipt.WarehouseId,
                        PurchaseOrderId = receipt.PurchaseOrderId,
                        ConfirmedBy = receipt.ConfirmedBy,
                        ConfirmedAt = receipt.ConfirmedAt,
                        ReceiptDate = today,
                        BackorderReason = $"Auto-generated backorder from receipt {receipt.ReceiptCode}",
                        CreatedBy = staffId
                    };

                    _context.Receipts.Add(childReceipt);
                    await _context.SaveChangesAsync();

                    decimal totalAmount = 0;
                    foreach (var shortage in shortageList)
                    {
                        var childDetail = new ReceiptDetail
                        {
                            ReceiptId = childReceipt.ReceiptId,
                            MaterialId = shortage.MaterialId,
                            SupplierId = shortage.SupplierId,
                            Quantity = shortage.ShortageQuantity,
                            UnitPrice = shortage.UnitPrice,
                            LineTotal = shortage.ShortageQuantity * (shortage.UnitPrice ?? 0)
                        };
                        _context.ReceiptDetails.Add(childDetail);
                        totalAmount += childDetail.LineTotal ?? 0;
                    }

                    childReceipt.TotalAmount = totalAmount;
                }

                // STEP 4: Finalize
                if (receipt.PurchaseOrderId.HasValue)
                {
                    var purchaseOrder = await _context.PurchaseOrders
                        .Include(o => o.Items)
                        .FirstOrDefaultAsync(o => o.PurchaseOrderId == receipt.PurchaseOrderId.Value);

                    if (purchaseOrder != null)
                    {
                        var totalOrdered = purchaseOrder.Items.Sum(i => i.OrderedQuantity);
                        var totalActual = receipt.ReceiptDetails.Sum(rd => rd.ActualQuantity ?? 0);

                        if (totalActual == totalOrdered)
                            purchaseOrder.Status = "FullyReceived";
                        else if (totalActual < totalOrdered)
                            purchaseOrder.Status = "PartiallyReceived";
                        else
                            purchaseOrder.Status = "OverReceived";
                    }
                }

                receipt.Status = "QCPassed";
                receipt.ConfirmedBy = staffId;
                receipt.ConfirmedAt = today;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<ReceiveGoodsFromPoResultDto> ReceiveGoodsFromPOAsync(ReceiveGoodsFromPoDto dto, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // STEP 1: basic validation
                if (dto.Items == null || dto.Items.Count == 0)
                    throw new ArgumentException("Items list cannot be empty");

                var validResults = new[] { "Pass", "Fail" };
                foreach (var item in dto.Items)
                {
                    if (!validResults.Contains(item.Result))
                        throw new ArgumentException($"Result must be 'Pass' or 'Fail' for MaterialId {item.MaterialId}");

                    if (item.Result == "Fail" && string.IsNullOrWhiteSpace(item.FailReason))
                        throw new ArgumentException($"FailReason is required when result is 'Fail' for MaterialId {item.MaterialId}");

                    if (item.ActualQuantity < 0 || item.PassQuantity < 0 || item.FailQuantity < 0)
                        throw new ArgumentException($"Quantities must be non-negative for MaterialId {item.MaterialId}");

                    if (item.PassQuantity + item.FailQuantity != item.ActualQuantity)
                        throw new ArgumentException($"PassQuantity + FailQuantity must equal ActualQuantity for MaterialId {item.MaterialId}");
                }

                var purchaseOrder = await _context.PurchaseOrders
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Material)
                    .FirstOrDefaultAsync(o => o.PurchaseOrderId == dto.PurchaseOrderId);

                if (purchaseOrder == null)
                    throw new KeyNotFoundException($"PurchaseOrder with ID {dto.PurchaseOrderId} not found");

                var allowedStatuses = new[] { "AdminApproved", "SentToSupplier", "PartiallyReceived", "OverReceived" };
                if (!allowedStatuses.Contains(purchaseOrder.Status))
                    throw new InvalidOperationException(
                        $"Cannot receive goods for PO {dto.PurchaseOrderId} with status '{purchaseOrder.Status}'");

                // STEP 2: validate supplementary receipt if provided
                SupplementaryReceipt? supplementaryReceipt = null;
                if (dto.SupplementaryReceiptId.HasValue)
                {
                    supplementaryReceipt = await _context.SupplementaryReceipts
                        .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == dto.SupplementaryReceiptId.Value);

                    if (supplementaryReceipt == null)
                        throw new KeyNotFoundException($"SupplementaryReceipt with ID {dto.SupplementaryReceiptId} not found");

                    if (supplementaryReceipt.PurchaseOrderId != dto.PurchaseOrderId)
                        throw new InvalidOperationException("Supplementary receipt does not belong to this purchase order");

                    if (supplementaryReceipt.Status != "Approved")
                        throw new InvalidOperationException("Supplementary receipt is not approved for receiving goods");
                }

                var warehouse = await _context.Warehouses
                    .OrderBy(w => w.WarehouseId)
                    .FirstOrDefaultAsync();

                if (warehouse == null)
                    throw new InvalidOperationException("No warehouse found to receive goods");

                var poItemMap = purchaseOrder.Items.ToDictionary(i => i.MaterialId, i => i);
                var requestedMaterialIds = dto.Items.Select(i => i.MaterialId).Distinct().ToList();

                var extraMaterials = requestedMaterialIds.Except(poItemMap.Keys).ToList();
                if (extraMaterials.Count > 0)
                    throw new ArgumentException("Receipt items contain materials not in PO");

                foreach (var item in dto.Items)
                {
                    if (item.ActualQuantity < 0)
                        throw new ArgumentException("ActualQuantity must be >= 0");
                }

                var receiptCode = await GenerateReceiptCodeAsync();
                var now = DateTime.UtcNow;

                var receipt = new Receipt
                {
                    ReceiptCode = receiptCode,
                    WarehouseId = warehouse.WarehouseId,
                    PurchaseOrderId = dto.PurchaseOrderId,
                    SupplementaryReceiptId = dto.SupplementaryReceiptId,
                    CreatedBy = staffId,
                    ReceiptDate = now,
                    Status = "PendingQC"
                };

                _context.Receipts.Add(receipt);
                await _context.SaveChangesAsync();

                decimal totalAmount = 0;
                var receiptDetails = new List<ReceiptDetail>();
                foreach (var item in dto.Items)
                {
                    var poItem = poItemMap[item.MaterialId];
                    var lineTotal = item.ActualQuantity * (poItem.UnitPrice ?? 0);

                    var detail = new ReceiptDetail
                    {
                        ReceiptId = receipt.ReceiptId,
                        MaterialId = item.MaterialId,
                        SupplierId = poItem.SupplierId ?? purchaseOrder.SupplierId,
                        Quantity = item.OrderedQuantity,
                        ActualQuantity = item.ActualQuantity,
                        UnitPrice = poItem.UnitPrice,
                        LineTotal = lineTotal,
                        BinLocationId = null,
                        BatchId = null
                    };

                    _context.ReceiptDetails.Add(detail);
                    receiptDetails.Add(detail);
                    totalAmount += lineTotal;
                }

                receipt.TotalAmount = totalAmount;

                await _context.SaveChangesAsync();

                var overallResult = dto.Items.Any(d => d.FailQuantity > 0 || d.Result == "Fail")
                    ? "Fail"
                    : "Pass";

                var hasFullPassForOrderedQty = dto.Items.All(d =>
                {
                    var orderedQty = poItemMap[d.MaterialId].OrderedQuantity;
                    return d.PassQuantity + 0.0001m >= orderedQty;
                });

                var qcCheckCode = await GenerateQCCheckCodeAsync();
                var detailMap = receiptDetails.ToDictionary(rd => rd.MaterialId, rd => rd);

                var qcCheck = new QCCheck
                {
                    QCCheckCode = qcCheckCode,
                    ReceiptId = receipt.ReceiptId,
                    CheckedBy = staffId,
                    CheckedAt = now,
                    OverallResult = overallResult,
                    Notes = dto.Notes,
                    QCCheckDetails = dto.Items.Select(d =>
                    {
                        var rd = detailMap[d.MaterialId];
                        var poItem = poItemMap[d.MaterialId];
                        var orderedQty = poItem.OrderedQuantity;
                        var quantityShortage = Math.Max(0, orderedQty - d.PassQuantity);
                        var hasFail = d.FailQuantity > 0 || d.Result == "Fail";

                        return new QCCheckDetail
                        {
                            ReceiptDetailId = rd.DetailId,
                            Result = d.Result,
                            FailReason = d.FailReason,
                            PassQuantity = d.PassQuantity,
                            FailQuantity = d.FailQuantity,
                            // Only initialize quantity shortage when this line is actually a failed QC line.
                            FailQuantityQuantity = hasFail && quantityShortage > 0 ? quantityShortage : null,
                            FailQuantityQuality = null,
                            FailQuantityDamage = null
                        };
                    }).ToList()
                };

                _context.QCChecks.Add(qcCheck);

                if (overallResult == "Pass" || hasFullPassForOrderedQty)
                {
                    string? poStatus = null;
                    if (receipt.PurchaseOrderId.HasValue)
                    {
                        var totalOrdered = purchaseOrder.Items.Sum(i => i.OrderedQuantity);
                        var currentPassQty = dto.Items.Sum(d => d.PassQuantity);
                        var completedPassQty = await GetAccumulatedPassQtyForPoAsync(
                            receipt.PurchaseOrderId.Value,
                            receipt.ReceiptId);

                        var totalPass = completedPassQty + currentPassQty;

                        if (totalPass == totalOrdered)
                            purchaseOrder.Status = "FullyReceived";
                        else if (totalPass < totalOrdered)
                            purchaseOrder.Status = "PartiallyReceived";
                        else
                            purchaseOrder.Status = "OverReceived";

                        poStatus = purchaseOrder.Status;
                    }

                    receipt.Status = "QCPassed";

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return new ReceiveGoodsFromPoResultDto
                    {
                        ReceiptId = receipt.ReceiptId,
                        PurchaseOrderId = dto.PurchaseOrderId,
                        SupplementaryReceiptId = dto.SupplementaryReceiptId,
                        Status = receipt.Status,
                        PoStatus = poStatus,
                        NextStep = $"POST /api/staff/receipts/{receipt.ReceiptId}/putaway"
                    };
                }

                receipt.Status = "PendingIncident";

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new ReceiveGoodsFromPoResultDto
                {
                    ReceiptId = receipt.ReceiptId,
                    PurchaseOrderId = dto.PurchaseOrderId,
                    SupplementaryReceiptId = dto.SupplementaryReceiptId,
                    Status = receipt.Status,
                    FailedItems = dto.Items
                        .Where(d => d.FailQuantity > 0 || d.Result == "Fail")
                        .Select(d => new QCFailedItemDto
                        {
                            MaterialId = d.MaterialId,
                            FailQuantity = d.FailQuantity,
                            FailReason = d.FailReason
                        })
                        .ToList(),
                    NextStep = $"POST /api/staff/receipts/{receipt.ReceiptId}/incident-report"
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<PendingPurchaseOrderDto>> GetPendingPurchaseOrdersAsync()
        {
            var newDeliveries = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .Where(o => o.Status == "SentToSupplier" && o.ExpectedDeliveryDate.HasValue)
                .Where(o => !_context.Receipts.Any(r => r.PurchaseOrderId == o.PurchaseOrderId)) // ensure no receipt created yet for this PO
                .OrderBy(o => o.ExpectedDeliveryDate)
                .Select(o => new PendingPurchaseOrderDto
                {
                    Type = "NewDelivery",
                    PurchaseOrderId = o.PurchaseOrderId,
                    PoCode = o.PurchaseOrderCode,
                    SupplierName = o.Supplier != null ? o.Supplier.Name : string.Empty,
                    ExpectedDeliveryDate = o.ExpectedDeliveryDate!.Value,
                    Items = o.Items.Select(i => new PendingPurchaseOrderItemDto
                    {
                        MaterialId = i.MaterialId,
                        MaterialName = i.Material != null ? i.Material.Name : string.Empty,
                        OrderedQuantity = i.OrderedQuantity,
                        Unit = i.Material != null ? i.Material.Unit ?? string.Empty : string.Empty
                    }).ToList()
                })
                .ToListAsync();

            var replacementDeliveries = await _context.SupplementaryReceipts
                .Include(s => s.PurchaseOrder)
                    .ThenInclude(p => p.Supplier)
                .Include(s => s.IncidentReport)
                    .ThenInclude(i => i.QCCheck)
                        .ThenInclude(q => q!.QCCheckDetails)
                .Include(s => s.Items)
                    .ThenInclude(i => i.Material)
                .Where(s => s.Status == "Approved" && s.ExpectedDeliveryDate.HasValue)
                .Where(s => s.IncidentReport.Status == "AwaitingSupplementaryGoods")
                .Where(s => !_context.Receipts.Any(r => r.SupplementaryReceiptId == s.SupplementaryReceiptId)) // ensure no receipt created yet for this supplementary receipt
                .OrderBy(s => s.ExpectedDeliveryDate)
                .Select(s => new PendingPurchaseOrderDto
                {
                    Type = "ReplacementDelivery",
                    PurchaseOrderId = s.PurchaseOrderId,
                    PoCode = s.PurchaseOrder.PurchaseOrderCode,
                    SupplierName = s.PurchaseOrder.Supplier != null ? s.PurchaseOrder.Supplier.Name : string.Empty,
                    ExpectedDeliveryDate = s.ExpectedDeliveryDate!.Value,
                    SupplementaryReceiptId = s.SupplementaryReceiptId,
                    IncidentId = s.IncidentId,
                    ReplacementQuantity = s.Items.Sum(i => i.SupplementaryQuantity),
                    OriginalFailReason = string.Join("; ",
                        s.IncidentReport.QCCheck!.QCCheckDetails
                            .Where(d => !string.IsNullOrWhiteSpace(d.FailReason))
                            .Select(d => d.FailReason)
                            .Distinct()),
                    Items = s.Items.Select(i => new PendingPurchaseOrderItemDto
                    {
                        MaterialId = i.MaterialId,
                        MaterialName = i.Material != null ? i.Material.Name : string.Empty,
                        OrderedQuantity = i.SupplementaryQuantity,
                        Unit = i.Material != null ? i.Material.Unit ?? string.Empty : string.Empty
                    }).ToList()
                })
                .ToListAsync();

            return newDeliveries.Concat(replacementDeliveries).ToList();
        }

        public async Task<PendingPurchaseOrderDto> GetPendingSupplementaryReceiptDetailAsync(long supplementaryReceiptId)
        {
            var supplementaryReceipt = await _context.SupplementaryReceipts
                .Include(s => s.PurchaseOrder)
                    .ThenInclude(p => p.Supplier)
                .Include(s => s.IncidentReport)
                    .ThenInclude(i => i.QCCheck)
                        .ThenInclude(q => q!.QCCheckDetails)
                .Include(s => s.Items)
                    .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == supplementaryReceiptId);

            if (supplementaryReceipt == null)
                throw new KeyNotFoundException($"SupplementaryReceipt with ID {supplementaryReceiptId} not found");

            if (!supplementaryReceipt.ExpectedDeliveryDate.HasValue)
                throw new InvalidOperationException("Supplementary receipt has no expected delivery date");

            var failReasons = supplementaryReceipt.IncidentReport?.QCCheck?.QCCheckDetails
                .Where(d => !string.IsNullOrWhiteSpace(d.FailReason))
                .Select(d => d.FailReason!)
                .Distinct()
                .ToList()
                ?? new List<string>();

            return new PendingPurchaseOrderDto
            {
                Type = "ReplacementDelivery",
                PurchaseOrderId = supplementaryReceipt.PurchaseOrderId,
                PoCode = supplementaryReceipt.PurchaseOrder?.PurchaseOrderCode ?? string.Empty,
                SupplierName = supplementaryReceipt.PurchaseOrder?.Supplier?.Name ?? string.Empty,
                ExpectedDeliveryDate = supplementaryReceipt.ExpectedDeliveryDate.Value,
                SupplementaryReceiptId = supplementaryReceipt.SupplementaryReceiptId,
                IncidentId = supplementaryReceipt.IncidentId,
                ReplacementQuantity = supplementaryReceipt.Items.Sum(i => i.SupplementaryQuantity),
                OriginalFailReason = string.Join("; ", failReasons),
                SupplierNote = supplementaryReceipt.SupplierNote,
                Items = supplementaryReceipt.Items.Select(i => new PendingPurchaseOrderItemDto
                {
                    MaterialId = i.MaterialId,
                    MaterialName = i.Material?.Name ?? string.Empty,
                    MaterialCode = i.Material?.Code ?? string.Empty,
                    OrderedQuantity = i.SupplementaryQuantity,
                    Unit = i.Material?.Unit ?? string.Empty,
                    IsDecimalUnit = i.Material?.IsDecimalUnit ?? false
                }).ToList()
            };
        }

        public async Task<List<PendingPutawayReceiptDto>> GetPendingPutawayReceiptsAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .Include(r => r.QCChecks)
                    .ThenInclude(q => q.QCCheckDetails)
                .Where(r => r.Status == "QCPassed" || r.Status == "ReadyForPutaway")
                .OrderByDescending(r => r.ConfirmedAt ?? r.ReceiptDate ?? r.ApprovedAt)
                .ToListAsync();

            var result = new List<PendingPutawayReceiptDto>();

            foreach (var receipt in receipts)
            {
                var qcCheck = receipt.QCChecks
                    .OrderByDescending(q => q.CheckedAt)
                    .FirstOrDefault();

                if (qcCheck == null)
                    continue;

                var passQtyMap = qcCheck.QCCheckDetails
                    .GroupBy(d => d.ReceiptDetailId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.PassQuantity));

                var note = receipt.Status == "ReadyForPutaway"
                    ? "Phan dat QC - cho NCC doi phan con lai"
                    : null;

                var items = receipt.ReceiptDetails
                    .Select(d =>
                    {
                        var passQty = passQtyMap.TryGetValue(d.DetailId, out var qty) ? qty : 0m;
                        return new PendingPutawayItemDto
                        {
                            MaterialId = d.MaterialId,
                            MaterialName = d.Material?.Name ?? string.Empty,
                            QuantityToPutaway = passQty,
                            Note = note,
                            Unit = d.Material?.Unit ?? string.Empty,
                            IsDecimalUnit = d.Material?.IsDecimalUnit ?? false
                        };
                    })
                    .Where(i => i.QuantityToPutaway > 0)
                    .ToList();

                if (items.Count == 0)
                    continue;

                result.Add(new PendingPutawayReceiptDto
                {
                    ReceiptId = receipt.ReceiptId,
                    ReceiptCode = receipt.ReceiptCode ?? string.Empty,
                    PurchaseOrderCode = receipt.PurchaseOrder?.PurchaseOrderCode ?? string.Empty,
                    SupplierName = receipt.PurchaseOrder?.Supplier?.Name ?? string.Empty,
                    CreatedAt = receipt.ReceiptDate ?? receipt.ApprovedAt ?? receipt.ConfirmedAt ?? DateTime.MinValue,
                    Status = receipt.Status ?? string.Empty,
                    WarehouseId = receipt.WarehouseId ?? 0,
                    WarehouseName = receipt.Warehouse?.Name ?? string.Empty,
                    Items = items
                });
            }

            return result;
        }

        public async Task<PendingPutawayReceiptDto> GetPendingPutawayReceiptDetailAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .Include(r => r.QCChecks)
                    .ThenInclude(q => q.QCCheckDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status != "QCPassed" && receipt.Status != "ReadyForPutaway")
                throw new InvalidOperationException("Receipt chua QC Pass hoac chua duoc phe duyet putaway");

            var qcCheck = receipt.QCChecks
                .OrderByDescending(q => q.CheckedAt)
                .FirstOrDefault();

            if (qcCheck == null)
                throw new InvalidOperationException("Receipt chua QC Pass");

            var passQtyMap = qcCheck.QCCheckDetails
                .GroupBy(d => d.ReceiptDetailId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.PassQuantity));

            var note = receipt.Status == "ReadyForPutaway"
                ? "Phan dat QC - cho NCC doi phan con lai"
                : null;

            var items = receipt.ReceiptDetails
                .Select(d =>
                {
                    var passQty = passQtyMap.TryGetValue(d.DetailId, out var qty) ? qty : 0m;
                    return new PendingPutawayItemDto
                    {
                        MaterialId = d.MaterialId,
                        MaterialCode = d.Material?.Code ?? string.Empty,
                        MaterialName = d.Material?.Name ?? string.Empty,
                        QuantityToPutaway = passQty,
                        Note = note,
                        Unit = d.Material?.Unit ?? string.Empty,
                        IsDecimalUnit = d.Material?.IsDecimalUnit ?? false
                    };
                })
                .Where(i => i.QuantityToPutaway > 0)
                .ToList();

            if (items.Count == 0)
                throw new InvalidOperationException("Khong co hang de putaway");

            return new PendingPutawayReceiptDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode ?? string.Empty,
                PurchaseOrderCode = receipt.PurchaseOrder?.PurchaseOrderCode ?? string.Empty,
                SupplierName = receipt.PurchaseOrder?.Supplier?.Name ?? string.Empty,
                Status = receipt.Status ?? string.Empty,
                WarehouseId = receipt.WarehouseId ?? 0,
                WarehouseName = receipt.Warehouse?.Name ?? string.Empty,
                Items = items
            };
        }

        public async Task<ReceiptPutawayResultDto> PutawayAsync(long receiptId, ReceiptPutawayDto dto, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.Items == null || dto.Items.Count == 0)
                    throw new ArgumentException("Items list cannot be empty");

                var receipt = await _context.Receipts
                    .Include(r => r.ReceiptDetails)
                        .ThenInclude(rd => rd.Material)
                    .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

                if (receipt == null)
                    throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

                if (receipt.Status != "QCPassed" && receipt.Status != "ReadyForPutaway")
                    throw new InvalidOperationException("Receipt chua QC Pass hoac chua duoc phe duyet putaway");

                if (!receipt.WarehouseId.HasValue)
                    throw new InvalidOperationException("Receipt warehouse is required");

                var qcCheck = await _context.QCChecks
                    .Include(q => q.QCCheckDetails)
                    .FirstOrDefaultAsync(q => q.ReceiptId == receiptId);

                if (qcCheck == null)
                    throw new InvalidOperationException("Receipt chua QC Pass");

                var receiptDetailMap = receipt.ReceiptDetails
                    .GroupBy(rd => rd.MaterialId)
                    .ToDictionary(g => g.Key, g => g.First());

                var passQtyMap = qcCheck.QCCheckDetails
                    .GroupBy(d => d.ReceiptDetailId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.PassQuantity));

                var binIds = dto.Items
                    .SelectMany(i => i.BinAllocations)
                    .Select(a => a.BinId)
                    .Distinct()
                    .ToList();

                var binMap = await _context.BinLocations
                    .Where(b => binIds.Contains(b.BinId))
                    .ToDictionaryAsync(b => b.BinId, b => b);

                var summary = new List<ReceiptPutawaySummaryDto>();
                var today = DateTime.UtcNow;
                var cardPrefix = $"WC-{today:yyyyMMdd}-";
                var cardSeq = await GetNextWarehouseCardSequenceAsync(today);

                foreach (var item in dto.Items)
                {
                    if (!receiptDetailMap.TryGetValue(item.MaterialId, out var receiptDetail))
                        throw new ArgumentException($"MaterialId {item.MaterialId} not found in receipt {receiptId}");

                    var passQty = passQtyMap.TryGetValue(receiptDetail.DetailId, out var pass)
                        ? pass
                        : 0m;

                    var totalAllocation = item.BinAllocations.Sum(a => a.Quantity);
                    if (totalAllocation != passQty)
                    {
                        var materialName = receiptDetail.Material?.Name ?? $"Material {item.MaterialId}";
                        throw new InvalidOperationException(
                            $"Tong so luong xep ke ({totalAllocation}) khac voi so luong QC Pass ({passQty}) cua {materialName}");
                    }

                    foreach (var allocation in item.BinAllocations)
                    {
                        if (!binMap.TryGetValue(allocation.BinId, out var bin))
                            throw new InvalidOperationException($"Ke {allocation.BinId} khong thuoc kho nay");

                        if (bin.WarehouseId != receipt.WarehouseId.Value)
                            throw new InvalidOperationException($"Ke {bin.Code} khong thuoc kho nay");
                    }

                    Batch batch;
                    if (item.Batch.BatchId.HasValue)
                    {
                        batch = await _context.Batches
                            .FirstOrDefaultAsync(b => b.BatchId == item.Batch.BatchId.Value)
                            ?? throw new KeyNotFoundException($"Batch with ID {item.Batch.BatchId} not found");

                        if (batch.MaterialId != item.MaterialId)
                            throw new InvalidOperationException("Batch khong thuoc material nay");
                    }
                    else
                    {
                        if (string.IsNullOrWhiteSpace(item.Batch.BatchCode))
                            throw new ArgumentException("BatchCode is required when creating new batch");

                        batch = new Batch
                        {
                            MaterialId = item.MaterialId,
                            BatchCode = item.Batch.BatchCode,
                            MfgDate = item.Batch.MfgDate,
                            ExpiryDate = item.Batch.ExpiryDate,
                            CertificateImage = item.Batch.CertificateImage,
                            CreatedDate = today
                        };

                        _context.Batches.Add(batch);
                        await _context.SaveChangesAsync();
                    }

                    foreach (var allocation in item.BinAllocations)
                    {
                        var allocationEntity = new ReceiptDetailBinAllocation
                        {
                            ReceiptDetailId = receiptDetail.DetailId,
                            BinId = allocation.BinId,
                            Quantity = allocation.Quantity,
                            BatchId = batch.BatchId
                        };
                        _context.ReceiptDetailBinAllocations.Add(allocationEntity);

                        var inventory = await _context.InventoryCurrents
                            .FirstOrDefaultAsync(i =>
                                i.WarehouseId == receipt.WarehouseId &&
                                i.MaterialId == item.MaterialId &&
                                i.BinId == allocation.BinId &&
                                i.BatchId == batch.BatchId);

                        var qtyBefore = inventory?.QuantityOnHand ?? 0;
                        var qtyAfter = qtyBefore + allocation.Quantity;

                        if (inventory == null)
                        {
                            inventory = new InventoryCurrent
                            {
                                WarehouseId = receipt.WarehouseId,
                                MaterialId = item.MaterialId,
                                BinId = allocation.BinId,
                                BatchId = batch.BatchId,
                                QuantityOnHand = allocation.Quantity,
                                LastUpdated = today
                            };
                            _context.InventoryCurrents.Add(inventory);
                        }
                        else
                        {
                            inventory.QuantityOnHand = qtyAfter;
                            inventory.LastUpdated = today;
                        }

                        var cardCode = $"{cardPrefix}{cardSeq:D4}";
                        cardSeq++;
                        var warehouseCard = new WarehouseCard
                        {
                            CardCode = cardCode,
                            WarehouseId = receipt.WarehouseId.Value,
                            MaterialId = item.MaterialId,
                            BinId = allocation.BinId,
                            BatchId = batch.BatchId,
                            TransactionType = "Import",
                            ReferenceId = receiptId,
                            ReferenceType = "Receipt",
                            TransactionDate = today,
                            Quantity = allocation.Quantity,
                            QuantityBefore = qtyBefore,
                            QuantityAfter = qtyAfter,
                            CreatedBy = staffId
                        };
                        _context.WarehouseCards.Add(warehouseCard);
                    }

                    receiptDetail.BatchId = batch.BatchId;
                    if (item.BinAllocations.Count == 1)
                        receiptDetail.BinLocationId = item.BinAllocations[0].BinId;

                    summary.Add(new ReceiptPutawaySummaryDto
                    {
                        MaterialName = receiptDetail.Material?.Name ?? string.Empty,
                        BatchCode = batch.BatchCode,
                        ExpiryDate = batch.ExpiryDate,
                        TotalQuantity = totalAllocation,
                        BinAllocations = item.BinAllocations.Select(a => new ReceiptPutawayBinSummaryDto
                        {
                            BinCode = binMap[a.BinId].Code,
                            Quantity = a.Quantity
                        }).ToList()
                    });
                }

                if (receipt.Status == "ReadyForPutaway")
                    receipt.Status = "PartiallyPutaway";
                else
                    receipt.Status = "ReadyForStamp";

                var currentPassQty = qcCheck.QCCheckDetails.Sum(d => d.PassQuantity);

                if (receipt.PurchaseOrderId.HasValue)
                {
                    var purchaseOrder = await _context.PurchaseOrders
                        .Include(po => po.Items)
                        .FirstOrDefaultAsync(po => po.PurchaseOrderId == receipt.PurchaseOrderId.Value);

                    if (purchaseOrder != null)
                    {
                        var orderedQty = purchaseOrder.Items.Sum(i => i.OrderedQuantity);

                        var completedPassQty = await _context.QCCheckDetails
                            .Where(d => d.QCCheck.Receipt.PurchaseOrderId == receipt.PurchaseOrderId.Value
                                     && d.QCCheck.Receipt.Status == "ReadyForStamp"
                                     && d.QCCheck.ReceiptId != receipt.ReceiptId)
                            .SumAsync(d => (decimal?)d.PassQuantity) ?? 0m;

                        completedPassQty += currentPassQty;

                        if (completedPassQty == orderedQty)
                            purchaseOrder.Status = "FullyReceived";
                        else if (completedPassQty < orderedQty)
                            purchaseOrder.Status = "PartiallyReceived";
                        else
                            purchaseOrder.Status = "OverReceived";
                    }
                }

                if (receipt.SupplementaryReceiptId.HasValue)
                {
                    var supplementaryReceipt = await _context.SupplementaryReceipts
                        .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == receipt.SupplementaryReceiptId.Value);

                    if (supplementaryReceipt != null)
                    {
                        supplementaryReceipt.Status = "GoodsReceived";

                        var incident = await _context.IncidentReports
                            .Include(i => i.Receipt)
                            .FirstOrDefaultAsync(i => i.IncidentId == supplementaryReceipt.IncidentId);

                        if (incident != null)
                        {
                            incident.Status = "Resolved";
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (receipt.Status == "ReadyForStamp")
                {
                    await CreateRoleNotificationsAsync(
                        "Manager",
                        $"Phiếu nhập {receipt.ReceiptCode} sẵn sàng để đóng dấu",
                        "Receipt",
                        receiptId);
                }

                return new ReceiptPutawayResultDto
                {
                    ReceiptId = receiptId,
                    Status = receipt.Status,
                    Summary = summary,
                    NextStep = receipt.Status == "ReadyForStamp"
                        ? $"POST /api/manager/receipts/{receiptId}/stamp"
                        : "Waiting supplementary goods"
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<ReceiptBatchLookupDto>> GetBatchesAsync(int materialId, string? batchCode)
        {
            if (materialId <= 0)
                throw new ArgumentException("materialId is required", nameof(materialId));

            var query = _context.Batches
                .Include(b => b.Material)
                .Where(b => b.MaterialId == materialId);

            if (!string.IsNullOrWhiteSpace(batchCode))
                query = query.Where(b => b.BatchCode.Contains(batchCode));

            return await query
                .OrderByDescending(b => b.CreatedDate)
                .Select(b => new ReceiptBatchLookupDto
                {
                    BatchId = b.BatchId,
                    BatchCode = b.BatchCode,
                    MfgDate = b.MfgDate,
                    ExpiryDate = b.ExpiryDate,
                    MaterialName = b.Material.Name,
                    CertificateImage = b.CertificateImage
                })
                .ToListAsync();
        }

        private async Task<Batch> GetOrCreateBatchAsync(int materialId, string? batchCode, DateTime? mfgDate, string? certificateImage)
        {
            // Try to find existing batch if batchCode is provided
            if (!string.IsNullOrEmpty(batchCode))
            {
                var existingBatch = await _context.Batches
                    .FirstOrDefaultAsync(b => b.BatchCode == batchCode && b.MaterialId == materialId);

                if (existingBatch != null)
                    return existingBatch;
            }

            // Create new batch
            var material = await _context.Materials.FindAsync(materialId);
            if (material == null)
                throw new KeyNotFoundException($"Material with ID {materialId} not found");

            var newBatchCode = batchCode ?? $"BATCH-{material.Code}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

            var batch = new Batch
            {
                MaterialId = materialId,
                BatchCode = newBatchCode,
                MfgDate = mfgDate,
                CertificateImage = certificateImage,
                CreatedDate = DateTime.UtcNow
            };

            _context.Batches.Add(batch);
            await _context.SaveChangesAsync(); // Save to get BatchId

            return batch;
        }

        #endregion

        #region Manager Methods

        public async Task<List<ManagerReceiptSummaryDto>> GetReceiptsForManagerAsync(string? status)
        {
            var targetStatus = string.IsNullOrWhiteSpace(status) ? "ReadyForStamp" : status;

            var receipts = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                .Where(r => r.Status == targetStatus || r.Status == "Stamped" || r.Status == "Closed")
                .OrderByDescending(r => r.ConfirmedAt ?? r.ReceiptDate ?? r.ApprovedAt)
                .ToListAsync();

            if (receipts.Count == 0)
                return new List<ManagerReceiptSummaryDto>();

            var receiptIds = receipts.Select(r => r.ReceiptId).ToList();

            var allocationTotals = await _context.ReceiptDetailBinAllocations
                .Where(a => receiptIds.Contains(a.ReceiptDetail.ReceiptId))
                .GroupBy(a => a.ReceiptDetail.ReceiptId)
                .Select(g => new
                {
                    ReceiptId = g.Key,
                    TotalQuantity = g.Sum(x => x.Quantity)
                })
                .ToDictionaryAsync(x => x.ReceiptId, x => x.TotalQuantity);

            var putawayInfo = await _context.WarehouseCards
                .Where(w => w.ReferenceType == "Receipt" && receiptIds.Contains(w.ReferenceId))
                .GroupBy(w => w.ReferenceId)
                .Select(g => g.OrderByDescending(x => x.TransactionDate)
                    .ThenByDescending(x => x.CardId)
                    .Select(x => new
                    {
                        ReceiptId = g.Key,
                        PutawayCompletedAt = (DateTime?)x.TransactionDate,
                        PutawayBy = (int?)x.CreatedBy
                    })
                    .First())
                .ToListAsync();

            var putawayInfoMap = putawayInfo
                .ToDictionary(
                    x => x.ReceiptId,
                    x => (x.PutawayCompletedAt, x.PutawayBy));

            var putawayUserMap = await BuildUserNameMapAsync(putawayInfo.Select(x => x.PutawayBy).ToArray());

            return receipts.Select(r =>
            {
                var hasPutaway = putawayInfoMap.TryGetValue(r.ReceiptId, out var info);

                return new ManagerReceiptSummaryDto
                {
                    ReceiptId = r.ReceiptId,
                    ReceiptCode = r.ReceiptCode,
                    PurchaseOrderCode = r.PurchaseOrder?.PurchaseOrderCode,
                    SupplierName = r.PurchaseOrder?.Supplier?.Name,
                    TotalItems = r.ReceiptDetails.Count,
                    TotalQuantity = allocationTotals.TryGetValue(r.ReceiptId, out var qty) ? qty : 0m,
                    PutawayCompletedAt = hasPutaway ? info.PutawayCompletedAt : null,
                    PutawayCompletedByName = hasPutaway ? ResolveUserName(putawayUserMap, info.PutawayBy) : null,
                    Status = r.Status ?? string.Empty
                };
            }).ToList();
        }

        public async Task<ManagerReceiptDetailDto> GetReceiptForManagerAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.BinAllocations)
                        .ThenInclude(a => a.Bin)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.BinAllocations)
                        .ThenInclude(a => a.Batch)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            // 1. Climb up to the root Receipt
            long currentRootReceiptId = receipt.ReceiptId;
            long? currentSupplId = receipt.SupplementaryReceiptId;

            while (currentSupplId.HasValue)
            {
                var parentSuppl = await _context.SupplementaryReceipts
                    .Include(s => s.IncidentReport)
                    .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == currentSupplId.Value);

                if (parentSuppl?.IncidentReport == null) break;

                currentRootReceiptId = parentSuppl.IncidentReport.ReceiptId;

                var parentReceipt = await _context.Receipts
                    .FirstOrDefaultAsync(r => r.ReceiptId == currentRootReceiptId);

                if (parentReceipt == null) break;
                currentSupplId = parentReceipt.SupplementaryReceiptId;
            }

            var relatedReceiptIdsList = new HashSet<long>();
            long? originalReceiptId = currentRootReceiptId;

            // 2. Traverse down from the root to find all children in the incident chain recursively
            var queue = new Queue<long>();
            queue.Enqueue(currentRootReceiptId);

            while (queue.Count > 0)
            {
                var currId = queue.Dequeue();

                if (relatedReceiptIdsList.Add(currId))
                {
                    var incidents = await _context.IncidentReports
                        .Where(i => i.ReceiptId == currId)
                        .Select(i => i.IncidentId)
                        .ToListAsync();

                    if (incidents.Any())
                    {
                        var supplIds = await _context.SupplementaryReceipts
                            .Where(s => incidents.Contains(s.IncidentId))
                            .Select(s => s.SupplementaryReceiptId)
                            .ToListAsync();

                        if (supplIds.Any())
                        {
                            var childReceiptIds = await _context.Receipts
                                .Where(r => r.SupplementaryReceiptId.HasValue && supplIds.Contains(r.SupplementaryReceiptId.Value))
                                .Select(r => r.ReceiptId)
                                .ToListAsync();

                            foreach (var childId in childReceiptIds)
                            {
                                queue.Enqueue(childId);
                            }
                        }
                    }
                }
            }

            var relatedReceiptIds = relatedReceiptIdsList.ToList();

            var chainReceipts = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.BinAllocations)
                        .ThenInclude(a => a.Bin)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.BinAllocations)
                        .ThenInclude(a => a.Batch)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Batch)
                .Where(r => relatedReceiptIds.Contains(r.ReceiptId))
                .ToListAsync();

            var latestQcs = await _context.QCChecks
                .Include(q => q.QCCheckDetails)
                .Where(q => relatedReceiptIds.Contains(q.ReceiptId))
                .GroupBy(q => q.ReceiptId)
                .Select(g => g.OrderByDescending(x => x.CheckedAt).First())
                .ToListAsync();

            var passQtyMap = latestQcs
                .SelectMany(q => q.QCCheckDetails)
                .GroupBy(d => d.ReceiptDetailId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.PassQuantity));

            var groupedItems = chainReceipts
                .SelectMany(r => r.ReceiptDetails.Select(detail => new
                {
                    ReceiptId = r.ReceiptId,
                    Detail = detail,
                    Source = !originalReceiptId.HasValue || r.ReceiptId == originalReceiptId.Value
                        ? "Original"
                        : "Supplementary"
                }))
                .GroupBy(x => new { x.Detail.MaterialId, x.ReceiptId })
                .Select(g =>
                {
                    var first = g.First();
                    var allocations = g.SelectMany(x => x.Detail.BinAllocations)
                        .GroupBy(a => a.Bin.Code)
                        .Select(a => new ManagerReceiptBinAllocationDto
                        {
                            BinCode = a.Key,
                            Quantity = a.Sum(v => v.Quantity)
                        })
                        .ToList();

                    var allocationBatch = g.SelectMany(x => x.Detail.BinAllocations)
                        .Select(a => a.Batch)
                        .FirstOrDefault(b => b != null);

                    var fallbackBatch = g.Select(x => x.Detail.Batch)
                        .FirstOrDefault(b => b != null);

                    var batch = allocationBatch ?? fallbackBatch;

                    return new ManagerReceiptDetailItemDto
                    {
                        MaterialId = g.Key.MaterialId,
                        MaterialName = first.Detail.Material?.Name ?? string.Empty,
                        Source = first.Source,
                        OrderedQuantity = g.Sum(x => x.Detail.Quantity),
                        ActualQuantity = g.Sum(x => x.Detail.ActualQuantity ?? 0m),
                        PassQuantity = g.Sum(x => passQtyMap.TryGetValue(x.Detail.DetailId, out var pass) ? pass : 0m),
                        BatchCode = batch?.BatchCode,
                        PutawayImage = batch?.CertificateImage,
                        ExpiryDate = batch?.ExpiryDate,
                        BinAllocations = allocations
                    };
                })
                .ToList();

            var totalQuantity = groupedItems.Sum(i => i.PassQuantity);

            var latestPutaway = await _context.WarehouseCards
                .Where(w => w.ReferenceType == "Receipt" && w.ReferenceId == receipt.ReceiptId)
                .OrderByDescending(w => w.TransactionDate)
                .ThenByDescending(w => w.CardId)
                .Select(w => new
                {
                    PutawayCompletedAt = (DateTime?)w.TransactionDate,
                    PutawayBy = (int?)w.CreatedBy
                })
                .FirstOrDefaultAsync();

            var putawayByNameMap = latestPutaway == null
                ? new Dictionary<int, string>()
                : await BuildUserNameMapAsync(latestPutaway.PutawayBy);

            return new ManagerReceiptDetailDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                PurchaseOrderId = receipt.PurchaseOrderId,
                PurchaseOrderCode = receipt.PurchaseOrder?.PurchaseOrderCode,
                SupplierName = receipt.PurchaseOrder?.Supplier?.Name,
                Status = receipt.Status ?? string.Empty,
                TotalQuantity = totalQuantity,
                PutawayCompletedAt = latestPutaway?.PutawayCompletedAt,
                PutawayCompletedByName = latestPutaway == null ? null : ResolveUserName(putawayByNameMap, latestPutaway.PutawayBy),
                Items = groupedItems
            };
        }

        public async Task<ManagerReceiptStampResultDto> StampReceiptAsync(long receiptId, ManagerReceiptStampDto dto, int managerId)
        {
            var receipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var canStampCurrentReceipt = receipt.Status == "ReadyForStamp"
                || (receipt.SupplementaryReceiptId.HasValue && receipt.Status == "PartiallyPutaway");

            if (!canStampCurrentReceipt)
                throw new InvalidOperationException("Chỉ có thể đóng dấu phiếu ReadyForStamp hoặc phiếu bổ sung PartiallyPutaway");

            var hasIncident = await _context.IncidentReports
                .AnyAsync(i => i.ReceiptId == receipt.ReceiptId);

            var now = DateTime.UtcNow;

            if (receipt.SupplementaryReceiptId.HasValue || hasIncident)
            {
                long currentRootReceiptId = receipt.ReceiptId;
                long? currentSupplId = receipt.SupplementaryReceiptId;

                while (currentSupplId.HasValue)
                {
                    var parentSuppl = await _context.SupplementaryReceipts
                        .Include(s => s.IncidentReport)
                        .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == currentSupplId.Value);

                    if (parentSuppl?.IncidentReport == null) break;

                    currentRootReceiptId = parentSuppl.IncidentReport.ReceiptId;

                    var parentReceipt = await _context.Receipts
                        .FirstOrDefaultAsync(r => r.ReceiptId == currentRootReceiptId);

                    if (parentReceipt == null) break;
                    currentSupplId = parentReceipt.SupplementaryReceiptId;
                }

                var relatedReceiptIdsList = new HashSet<long>();
                var queue = new Queue<long>();
                queue.Enqueue(currentRootReceiptId);

                while (queue.Count > 0)
                {
                    var currId = queue.Dequeue();

                    if (relatedReceiptIdsList.Add(currId))
                    {
                        var incidents = await _context.IncidentReports
                            .Where(i => i.ReceiptId == currId)
                            .Select(i => i.IncidentId)
                            .ToListAsync();

                        if (incidents.Any())
                        {
                            var supplIds = await _context.SupplementaryReceipts
                                .Where(s => incidents.Contains(s.IncidentId))
                                .Select(s => s.SupplementaryReceiptId)
                                .ToListAsync();

                            if (supplIds.Any())
                            {
                                var childReceiptIds = await _context.Receipts
                                    .Where(r => r.SupplementaryReceiptId.HasValue && supplIds.Contains(r.SupplementaryReceiptId.Value))
                                    .Select(r => r.ReceiptId)
                                    .ToListAsync();

                                foreach (var childId in childReceiptIds)
                                {
                                    queue.Enqueue(childId);
                                }
                            }
                        }
                    }
                }

                var relatedReceipts = await _context.Receipts
                    .Where(r => relatedReceiptIdsList.Contains(r.ReceiptId))
                    .ToListAsync();

                var invalidReceipts = relatedReceipts
                    .Where(r => r.ReceiptId != receipt.ReceiptId && r.Status != "PartiallyPutaway")
                    .ToList();

                if (invalidReceipts.Any())
                {
                    var invalidCodes = string.Join(", ", invalidReceipts.Select(r => r.ReceiptCode));
                    throw new InvalidOperationException($"Không thể đóng dấu. Các phiếu {invalidCodes} đang không ở trạng thái PartiallyPutaway.");
                }

                // Cập nhật trạng thái của tất cả các phiếu trong chuỗi thành Stamped luôn
                foreach (var r in relatedReceipts.Where(x => x.ReceiptId != receipt.ReceiptId))
                {
                    r.Status = "Stamped";
                    r.StampedByManagerId = managerId;
                    r.StampedAt = now;
                    r.StampNotes = dto.Notes;
                }
            }

            receipt.Status = "Stamped";
            receipt.StampedByManagerId = managerId;
            receipt.StampedAt = now;
            receipt.StampNotes = dto.Notes;

            await _context.SaveChangesAsync();

            await CreateRoleNotificationsAsync(
                "Accountant",
                $"Phiếu nhập {receipt.ReceiptCode} đã được Thủ kho xác nhận. Vui lòng hạch toán.",
                "Receipt",
                receiptId);

            var userMap = await BuildUserNameMapAsync(managerId);
            var managerName = ResolveUserName(userMap, managerId);

            return new ManagerReceiptStampResultDto
            {
                ReceiptId = receipt.ReceiptId,
                Status = receipt.Status,
                StampedBy = managerName,
                StampedAt = receipt.StampedAt,
                Notes = receipt.StampNotes,
                NextStep = $"POST /api/accountant/receipts/{receiptId}/close"
            };
        }

        #endregion

        #region Warehouse Card Methods

        public async Task<List<WarehouseCardDto>> GetWarehouseCardsAsync(WarehouseCardQueryDto query)
        {
            var queryable = _context.WarehouseCards
                .Include(w => w.Warehouse)
                .Include(w => w.Material)
                .Include(w => w.Bin)
                .Include(w => w.Batch)
                .Include(w => w.CreatedByNavigation)
                .AsQueryable();

            if (query.CardId.HasValue)
                queryable = queryable.Where(w => w.CardId == query.CardId.Value);

            if (query.WarehouseId.HasValue)
                queryable = queryable.Where(w => w.WarehouseId == query.WarehouseId.Value);

            if (query.MaterialId.HasValue)
                queryable = queryable.Where(w => w.MaterialId == query.MaterialId.Value);

            if (query.BinId.HasValue)
                queryable = queryable.Where(w => w.BinId == query.BinId.Value);

            if (query.ReferenceId.HasValue)
                queryable = queryable.Where(w => w.ReferenceId == query.ReferenceId.Value);

            if (!string.IsNullOrEmpty(query.ReferenceType))
                queryable = queryable.Where(w => w.ReferenceType == query.ReferenceType);

            if (query.FromDate.HasValue)
                queryable = queryable.Where(w => w.TransactionDate >= query.FromDate.Value);

            if (query.ToDate.HasValue)
                queryable = queryable.Where(w => w.TransactionDate <= query.ToDate.Value.AddDays(1));

            if (!string.IsNullOrEmpty(query.TransactionType))
                queryable = queryable.Where(w => w.TransactionType == query.TransactionType);

            return await queryable
                .OrderByDescending(w => w.TransactionDate)
                .Select(w => new WarehouseCardDto
                {
                    CardId = w.CardId,
                    CardCode = w.CardCode,
                    WarehouseId = w.WarehouseId,
                    WarehouseName = w.Warehouse.Name,
                    MaterialId = w.MaterialId,
                    MaterialCode = w.Material.Code,
                    MaterialName = w.Material.Name,
                    MaterialUnit = w.Material.Unit,
                    BinId = w.BinId,
                    BinCode = w.Bin.Code,
                    BatchId = w.BatchId,
                    BatchCode = w.Batch.BatchCode,
                    TransactionType = w.TransactionType,
                    ReferenceId = w.ReferenceId,
                    ReferenceType = w.ReferenceType,
                    TransactionDate = w.TransactionDate,
                    Quantity = w.Quantity,
                    QuantityBefore = w.QuantityBefore,
                    QuantityAfter = w.QuantityAfter,
                    CreatedBy = w.CreatedBy,
                    CreatedByName = w.CreatedByNavigation.FullName,
                    Notes = w.Notes
                })
                .ToListAsync();
        }

        public async Task<List<WarehouseCardDto>> GetWarehouseCardsByMaterialAsync(int materialId)
        {
            var exists = await _context.Materials.AnyAsync(m => m.MaterialId == materialId);
            if (!exists)
                throw new KeyNotFoundException($"Material with ID {materialId} not found");

            return await _context.WarehouseCards
                .Include(w => w.Warehouse)
                .Include(w => w.Material)
                .Include(w => w.Bin)
                .Include(w => w.Batch)
                .Include(w => w.CreatedByNavigation)
                .Where(w => w.MaterialId == materialId)
                .OrderByDescending(w => w.TransactionDate)
                .Select(w => new WarehouseCardDto
                {
                    CardId = w.CardId,
                    CardCode = w.CardCode,
                    WarehouseId = w.WarehouseId,
                    WarehouseName = w.Warehouse.Name,
                    MaterialId = w.MaterialId,
                    MaterialCode = w.Material.Code,
                    MaterialName = w.Material.Name,
                    MaterialUnit = w.Material.Unit,
                    BinId = w.BinId,
                    BinCode = w.Bin.Code,
                    BatchId = w.BatchId,
                    BatchCode = w.Batch.BatchCode,
                    TransactionType = w.TransactionType,
                    ReferenceId = w.ReferenceId,
                    ReferenceType = w.ReferenceType,
                    TransactionDate = w.TransactionDate,
                    Quantity = w.Quantity,
                    QuantityBefore = w.QuantityBefore,
                    QuantityAfter = w.QuantityAfter,
                    CreatedBy = w.CreatedBy,
                    CreatedByName = w.CreatedByNavigation.FullName,
                    Notes = w.Notes
                })
                .ToListAsync();
        }

        #endregion

        #region QC Check Methods

        public async Task<QCSubmitResultDto> SubmitQCCheckAsync(long receiptId, SubmitQCCheckDto dto, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            // STEP 1: validate inputs
            var validResults = new[] { "Pass", "Fail" };
            if (dto.Details == null || dto.Details.Count == 0)
                throw new ArgumentException("Details list cannot be empty");

            foreach (var d in dto.Details)
            {
                if (!validResults.Contains(d.Result))
                    throw new ArgumentException($"Result must be 'Pass' or 'Fail' for MaterialId {d.MaterialId}");

                if (d.Result == "Fail" && string.IsNullOrWhiteSpace(d.FailReason))
                    throw new ArgumentException($"FailReason is required when result is 'Fail' for MaterialId {d.MaterialId}");

                if (d.ActualQuantity < 0 || d.PassQuantity < 0 || d.FailQuantity < 0)
                    throw new ArgumentException($"Quantities must be non-negative for MaterialId {d.MaterialId}");

                if (d.PassQuantity + d.FailQuantity != d.ActualQuantity)
                    throw new ArgumentException($"PassQuantity + FailQuantity must equal ActualQuantity for MaterialId {d.MaterialId}");

                if (d.Result == "Pass" && d.FailQuantity > 0)
                    throw new ArgumentException($"FailQuantity must be 0 when result is 'Pass' for MaterialId {d.MaterialId}");
            }

            // STEP 2: load receipt for QC flow
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status != "PendingQC")
                throw new InvalidOperationException(
                    $"Cannot submit QC check for receipt with status '{receipt.Status}'. Must be 'PendingQC'");

            // Check duplicate QC check
            var existingQC = await _context.QCChecks
                .FirstOrDefaultAsync(q => q.ReceiptId == receiptId);
            if (existingQC != null)
                throw new InvalidOperationException(
                    $"A QC check already exists for receipt {receipt.ReceiptCode} (QCCheckCode: {existingQC.QCCheckCode})");

            var receiptDetailMap = receipt.ReceiptDetails
                .GroupBy(rd => rd.MaterialId)
                .ToDictionary(g => g.Key, g => g.First());

            var invalidMaterials = dto.Details
                .Where(d => !receiptDetailMap.ContainsKey(d.MaterialId))
                .Select(d => d.MaterialId)
                .Distinct()
                .ToList();

            if (invalidMaterials.Any())
                throw new ArgumentException(
                    $"MaterialIds {string.Join(", ", invalidMaterials)} do not belong to receipt {receiptId}");

            // STEP 3: determine overall result
            var overallResult = dto.Details.Any(d => d.FailQuantity > 0 || d.Result == "Fail")
                ? "Fail"
                : "Pass";

            // Business rule: when QC pass fully matches ordered quantity,
            // bypass incident creation even if failed extras exist.
            var hasFullPassForOrderedQty = dto.Details.All(d =>
            {
                var orderedQty = receiptDetailMap[d.MaterialId].Quantity;
                return d.PassQuantity + 0.0001m >= orderedQty;
            });

            // STEP 4: generate QCCheckCode
            var today = DateTime.UtcNow;
            var codePrefix = $"QC-{today:yyyyMMdd}-";
            var lastQC = await _context.QCChecks
                .Where(q => q.QCCheckCode.StartsWith(codePrefix))
                .OrderByDescending(q => q.QCCheckId)
                .FirstOrDefaultAsync();

            int nextSeq = 1;
            if (lastQC != null)
            {
                var parts = lastQC.QCCheckCode.Split('-');
                if (parts.Length > 0 && int.TryParse(parts[^1], out int lastSeq))
                    nextSeq = lastSeq + 1;
            }

            var qcCheck = new QCCheck
            {
                QCCheckCode = $"{codePrefix}{nextSeq:D4}",
                ReceiptId = receiptId,
                CheckedBy = staffId,
                CheckedAt = today,
                OverallResult = overallResult,
                Notes = dto.Notes,
                QCCheckDetails = dto.Details.Select(d => new QCCheckDetail
                {
                    ReceiptDetailId = receiptDetailMap[d.MaterialId].DetailId,
                    Result = d.Result,
                    FailReason = d.FailReason,
                    PassQuantity = d.PassQuantity,
                    FailQuantity = d.FailQuantity
                }).ToList()
            };

            _context.QCChecks.Add(qcCheck);

            // STEP 5: update receipt details with actual quantities
            foreach (var d in dto.Details)
            {
                var detail = receiptDetailMap[d.MaterialId];
                detail.ActualQuantity = d.ActualQuantity;
            }

            // STEP 6: finalize based on QC result
            if (overallResult == "Pass" || hasFullPassForOrderedQty)
            {
                receipt.Status = "QCPassed";

                string? poStatus = null;

                // Update PO status if receipt is linked to PO
                if (receipt.PurchaseOrderId.HasValue)
                {
                    var purchaseOrder = await _context.PurchaseOrders
                        .Include(o => o.Items)
                        .FirstOrDefaultAsync(o => o.PurchaseOrderId == receipt.PurchaseOrderId.Value);

                    if (purchaseOrder != null)
                    {
                        var totalOrdered = purchaseOrder.Items.Sum(i => i.OrderedQuantity);
                        var currentPassQty = dto.Details.Sum(d => d.PassQuantity);
                        var completedPassQty = await GetAccumulatedPassQtyForPoAsync(
                            receipt.PurchaseOrderId.Value,
                            receipt.ReceiptId);

                        var totalPass = completedPassQty + currentPassQty;

                        if (totalPass == totalOrdered)
                            purchaseOrder.Status = "FullyReceived";
                        else if (totalPass < totalOrdered)
                            purchaseOrder.Status = "PartiallyReceived";
                        else
                            purchaseOrder.Status = "OverReceived";

                        poStatus = purchaseOrder.Status;
                    }
                }

                // Update supplementary receipt if present
                if (receipt.SupplementaryReceiptId.HasValue)
                {
                    var supplementaryReceipt = await _context.SupplementaryReceipts
                        .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == receipt.SupplementaryReceiptId.Value);

                    if (supplementaryReceipt != null)
                    {
                        supplementaryReceipt.Status = "GoodsReceived";

                        // Resolve incident when replacement goods pass QC
                        var incident = await _context.IncidentReports
                            .FirstOrDefaultAsync(i => i.IncidentId == supplementaryReceipt.IncidentId);

                        if (incident != null)
                            incident.Status = "Resolved";
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Notify manager when supplementary goods pass QC
                if (receipt.SupplementaryReceiptId.HasValue)
                {
                    await CreateRoleNotificationsAsync(
                        "Manager",
                        $"Supplementary receipt {receipt.SupplementaryReceiptId} passed QC and goods were received.",
                        "SupplementaryReceipt",
                        receipt.SupplementaryReceiptId);
                }

                return new QCSubmitResultDto
                {
                    Status = receipt.Status,
                    PoStatus = poStatus,
                    NextStep = $"POST /api/staff/receipts/{receiptId}/putaway"
                };
            }

            // QC fail case: no inventory update, move to PendingIncident
            receipt.Status = "PendingIncident";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new QCSubmitResultDto
            {
                Status = receipt.Status,
                FailedItems = dto.Details
                    .Where(d => d.FailQuantity > 0)
                    .Select(d => new QCFailedItemDto
                    {
                        MaterialId = d.MaterialId,
                        FailQuantity = d.FailQuantity,
                        FailReason = d.FailReason
                    })
                    .ToList(),
                NextStep = $"POST /api/staff/receipts/{receiptId}/incident-report"
            };
        }

        public async Task<QCCheckDto> GetQCCheckByReceiptAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var qcCheck = await _context.QCChecks
                .Include(q => q.QCCheckDetails)
                .Include(q => q.CheckedByNavigation)
                .FirstOrDefaultAsync(q => q.ReceiptId == receiptId);

            if (qcCheck == null)
                throw new KeyNotFoundException($"No QC check found for receipt ID {receiptId}");

            return MapQCCheckToDto(qcCheck, receipt.ReceiptCode, receipt.ReceiptDetails,
                qcCheck.CheckedByNavigation?.FullName ?? qcCheck.CheckedByNavigation?.Email);
        }

        private static QCCheckDto MapQCCheckToDto(
            QCCheck qcCheck,
            string receiptCode,
            IEnumerable<ReceiptDetail> receiptDetails,
            string? checkedByName = null)
        {
            var detailMap = receiptDetails.ToDictionary(rd => rd.DetailId);

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
                Details = qcCheck.QCCheckDetails.Select(d =>
                {
                    detailMap.TryGetValue(d.ReceiptDetailId, out var rd);
                    return new QCCheckDetailDto
                    {
                        DetailId = d.DetailId,
                        ReceiptDetailId = d.ReceiptDetailId,
                        MaterialId = rd?.MaterialId,
                        MaterialCode = rd?.Material?.Code,
                        MaterialName = rd?.Material?.Name,
                        Result = d.Result,
                        FailReason = d.FailReason,
                        PassQuantity = d.PassQuantity,
                        FailQuantity = d.FailQuantity
                    };
                }).ToList()
            };
        }

        #endregion

        #region Incident Report Methods

        public async Task<IncidentReportCreateResultDto> CreateIncidentReportAsync(long receiptId, CreateIncidentReportDto dto, int staffId)
        {
            // STEP 1: validate input
            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new ArgumentException("Description is required");

            if (dto.Details == null || dto.Details.Count == 0)
                throw new ArgumentException("Details list cannot be empty");

            foreach (var d in dto.Details)
            {
                if (d.Breakdown == null)
                    throw new ArgumentException($"Breakdown is required for MaterialId {d.MaterialId}");

                if (d.Breakdown.Quantity < 0 || d.Breakdown.Quality < 0 || d.Breakdown.Damage < 0)
                    throw new ArgumentException($"Breakdown values must be >= 0 for MaterialId {d.MaterialId}");

                if (d.Breakdown.Quantity + d.Breakdown.Quality + d.Breakdown.Damage <= 0)
                    throw new ArgumentException(
                        $"At least one breakdown value must be > 0 for MaterialId {d.MaterialId}");
            }

            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status != "PendingIncident")
                throw new InvalidOperationException("Receipt không ở trạng thái chờ biên bản");

            // Kiểm tra đã có biên bản chưa
            var existing = await _context.IncidentReports
                .FirstOrDefaultAsync(i => i.ReceiptId == receiptId);
            if (existing != null)
                throw new InvalidOperationException(
                    $"An incident report already exists for receipt {receipt.ReceiptCode} (IncidentCode: {existing.IncidentCode})");

            // Validate material IDs belong to receipt details
            var receiptDetailMap = receipt.ReceiptDetails
                .GroupBy(rd => rd.MaterialId)
                .ToDictionary(g => g.Key, g => g.First());

            var duplicateMaterialIds = dto.Details
                .GroupBy(d => d.MaterialId)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateMaterialIds.Any())
                throw new ArgumentException(
                    $"Each MaterialId can only appear once. Duplicate MaterialIds: {string.Join(", ", duplicateMaterialIds)}");

            var invalidMaterials = dto.Details
                .Where(d => !receiptDetailMap.ContainsKey(d.MaterialId))
                .Select(d => d.MaterialId)
                .Distinct()
                .ToList();

            if (invalidMaterials.Any())
                throw new ArgumentException(
                    $"MaterialIds {string.Join(", ", invalidMaterials)} do not belong to receipt {receiptId}");

            var linkedQCCheck = await _context.QCChecks
                .Include(q => q.QCCheckDetails)
                .FirstOrDefaultAsync(q => q.ReceiptId == receiptId);

            if (linkedQCCheck == null)
                throw new InvalidOperationException("Receipt không ở trạng thái chờ biên bản");

            var failedQcDetails = linkedQCCheck.QCCheckDetails
                .Where(d => d.Result == "Fail" || d.FailQuantity > 0)
                .ToList();

            // Generate IncidentCode
            var today = DateTime.UtcNow;
            var prefix = $"INC-{today:yyyyMMdd}-";
            var lastInc = await _context.IncidentReports
                .Where(i => i.IncidentCode.StartsWith(prefix))
                .OrderByDescending(i => i.IncidentId)
                .FirstOrDefaultAsync();

            int nextSeq = 1;
            if (lastInc != null)
            {
                var parts = lastInc.IncidentCode.Split('-');
                if (parts.Length > 0 && int.TryParse(parts[^1], out int lastSeq))
                    nextSeq = lastSeq + 1;
            }

            var purchaseOrder = receipt.PurchaseOrderId.HasValue
                ? await _context.PurchaseOrders
                    .Include(o => o.Supplier)
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.PurchaseOrderId == receipt.PurchaseOrderId.Value)
                : null;

            if (receipt.PurchaseOrderId.HasValue && purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {receipt.PurchaseOrderId} not found");

            var evidenceImages = new List<IncidentEvidenceImage>();
            var incidentDetails = new List<IncidentReportDetail>();

            foreach (var d in dto.Details)
            {
                if (!receiptDetailMap.TryGetValue(d.MaterialId, out var receiptDetail))
                    continue;

                var qcDetail = failedQcDetails
                    .FirstOrDefault(x => x.ReceiptDetailId == receiptDetail.DetailId);

                if (qcDetail == null)
                {
                    var materialName = receiptDetail.Material?.Name ?? $"Material {d.MaterialId}";
                    throw new InvalidOperationException(
                        $"Material {materialName} không có lỗi QC để lập biên bản");
                }

                var orderedQty = receiptDetail.Quantity;

                // Claim quantity must follow shortage of usable goods: max(0, Ordered - Pass).
                var expectedClaimQuantity = Math.Max(0, orderedQty - qcDetail.PassQuantity);
                var quantityDefect = d.Breakdown.Quantity;
                var qualityDefect = d.Breakdown.Quality;
                var damageDefect = d.Breakdown.Damage;
                var totalBreakdownForMaterial = quantityDefect + qualityDefect + damageDefect;

                if (Math.Abs(totalBreakdownForMaterial - expectedClaimQuantity) > 0.0001m)
                {
                    throw new ArgumentException(
                        $"MaterialId {d.MaterialId}: Breakdown sum (Quantity+Quality+Damage={totalBreakdownForMaterial:F4}) " +
                        $"must equal claim quantity ({expectedClaimQuantity:F4}) where claim = max(0, Ordered - Pass).");
                }

                qcDetail.FailQuantityQuantity = quantityDefect;
                qcDetail.FailQuantityQuality = qualityDefect;
                qcDetail.FailQuantityDamage = damageDefect;

                var images = d.EvidenceImages?.Where(i => !string.IsNullOrWhiteSpace(i)).ToList()
                    ?? new List<string>();

                if (images.Count == 0)
                {
                    var materialName = receiptDetail.Material?.Name ?? $"Material {d.MaterialId}";
                    throw new InvalidOperationException(
                        $"Cần ít nhất 1 ảnh bằng chứng cho {materialName}");
                }

                if (quantityDefect > 0)
                {
                    var detail = new IncidentReportDetail
                    {
                        ReceiptDetailId = receiptDetail.DetailId,
                        MaterialId = d.MaterialId,
                        ExpectedQuantity = orderedQty,
                        ActualQuantity = qcDetail.PassQuantity + qcDetail.FailQuantity,
                        IssueType = "Quantity",
                        Notes = d.EvidenceNote
                    };
                    incidentDetails.Add(detail);

                    foreach (var image in images)
                    {
                        evidenceImages.Add(new IncidentEvidenceImage
                        {
                            IncidentReportDetail = detail,
                            ImageData = image,
                            UploadedAt = today,
                            UploadedByStaffId = staffId
                        });
                    }
                }

                if (qualityDefect > 0)
                {
                    var detail = new IncidentReportDetail
                    {
                        ReceiptDetailId = receiptDetail.DetailId,
                        MaterialId = d.MaterialId,
                        ExpectedQuantity = orderedQty,
                        ActualQuantity = qcDetail.PassQuantity + qcDetail.FailQuantity,
                        IssueType = "Quality",
                        Notes = d.EvidenceNote
                    };
                    incidentDetails.Add(detail);

                    foreach (var image in images)
                    {
                        evidenceImages.Add(new IncidentEvidenceImage
                        {
                            IncidentReportDetail = detail,
                            ImageData = image,
                            UploadedAt = today,
                            UploadedByStaffId = staffId
                        });
                    }
                }

                if (damageDefect > 0)
                {
                    var detail = new IncidentReportDetail
                    {
                        ReceiptDetailId = receiptDetail.DetailId,
                        MaterialId = d.MaterialId,
                        ExpectedQuantity = orderedQty,
                        ActualQuantity = qcDetail.PassQuantity + qcDetail.FailQuantity,
                        IssueType = "Damage",
                        Notes = d.EvidenceNote
                    };
                    incidentDetails.Add(detail);

                    foreach (var image in images)
                    {
                        evidenceImages.Add(new IncidentEvidenceImage
                        {
                            IncidentReportDetail = detail,
                            ImageData = image,
                            UploadedAt = today,
                            UploadedByStaffId = staffId
                        });
                    }
                }
            }

            // Validate that at least one incident detail was created after processing
            if (incidentDetails.Count == 0)
            {
                throw new InvalidOperationException(
                    "No valid incident details created. All Quantity issues may have been skipped if passed quantities met or exceeded ordered quantities. " +
                    "Please verify the quality/damage issues are reported correctly or check if QC results need revision.");
            }

            var incident = new IncidentReport
            {
                IncidentCode = $"{prefix}{nextSeq:D4}",
                ReceiptId = receiptId,
                PurchaseOrderId = receipt.PurchaseOrderId,
                QCCheckId = linkedQCCheck.QCCheckId,
                CreatedBy = staffId,
                CreatedAt = today,
                Description = dto.Description,
                Status = "Open",
                IncidentReportDetails = incidentDetails
            };

            _context.IncidentReports.Add(incident);
            _context.IncidentEvidenceImages.AddRange(evidenceImages);

            receipt.Status = "PendingIncident";

            await _context.SaveChangesAsync();

            var totalExpectedClaimQuantity = dto.Details.Sum(d =>
            {
                if (!receiptDetailMap.TryGetValue(d.MaterialId, out var rd))
                    return 0m;

                var qcd = linkedQCCheck.QCCheckDetails.FirstOrDefault(q => q.ReceiptDetailId == rd.DetailId);
                if (qcd == null)
                    return 0m;

                return Math.Max(0, rd.Quantity - qcd.PassQuantity);
            });

            var totalClaimBreakdown = dto.Details.Sum(d =>
                d.Breakdown.Quantity + d.Breakdown.Quality + d.Breakdown.Damage);

            if (Math.Abs(totalClaimBreakdown - totalExpectedClaimQuantity) > 0.0001m)
            {
                throw new InvalidOperationException(
                    $"Incident detail breakdown mismatch: " +
                    $"Breakdown total (Quantity+Quality+Damage) is {totalClaimBreakdown:F4}, " +
                    $"but total claim quantity is {totalExpectedClaimQuantity:F4}.");
            }

            var totalFailQuantity = totalExpectedClaimQuantity;

            return new IncidentReportCreateResultDto
            {
                IncidentId = incident.IncidentId,
                ReceiptId = receiptId,
                Status = incident.Status,
                Summary = new IncidentReportCreateSummaryDto
                {
                    TotalFailItems = incidentDetails.Count,
                    TotalFailQuantity = totalFailQuantity,
                    SupplierName = purchaseOrder?.Supplier?.Name ?? string.Empty
                },
                NextStep = $"POST /api/staff/incidents/{incident.IncidentId}/submit-to-manager"
            };
        }

        private static IncidentReportDto MapIncidentReportToDto(
            IncidentReport incident,
            string receiptCode,
            IEnumerable<ReceiptDetail> receiptDetails,
            QCCheck? qcCheck,
            string? createdByName,
            string? resolvedByName)
        {
            var detailMap = receiptDetails.ToDictionary(rd => rd.DetailId);

            return new IncidentReportDto
            {
                IncidentId = incident.IncidentId,
                IncidentCode = incident.IncidentCode,
                ReceiptId = incident.ReceiptId,
                ReceiptCode = receiptCode,
                QCCheckId = incident.QCCheckId,
                QCCheckCode = qcCheck?.QCCheckCode,
                QCOverallResult = qcCheck?.OverallResult,
                CreatedBy = incident.CreatedBy,
                CreatedByName = createdByName,
                CreatedAt = incident.CreatedAt,
                Description = incident.Description,
                Status = incident.Status,
                Resolution = incident.Resolution,
                ResolvedAt = incident.ResolvedAt,
                ResolvedBy = incident.ResolvedBy,
                ResolvedByName = resolvedByName,
                Details = incident.IncidentReportDetails.Select(d =>
                {
                    detailMap.TryGetValue(d.ReceiptDetailId, out var rd);
                    return new IncidentReportDetailDto
                    {
                        DetailId = d.DetailId,
                        ReceiptDetailId = d.ReceiptDetailId,
                        MaterialId = d.MaterialId,
                        MaterialCode = d.Material?.Code ?? rd?.Material?.Code,
                        MaterialName = d.Material?.Name ?? rd?.Material?.Name,
                        MaterialUnit = d.Material?.Unit ?? rd?.Material?.Unit,
                        ExpectedQuantity = d.ExpectedQuantity,
                        ActualQuantity = d.ActualQuantity,
                        IssueType = d.IssueType,
                        Breakdown = new IncidentBreakdownDto
                        {
                            Quantity = qcCheck?.QCCheckDetails
                                .FirstOrDefault(q => q.ReceiptDetailId == d.ReceiptDetailId)?.FailQuantityQuantity ?? 0m,
                            Quality = qcCheck?.QCCheckDetails
                                .FirstOrDefault(q => q.ReceiptDetailId == d.ReceiptDetailId)?.FailQuantityQuality ?? 0m,
                            Damage = qcCheck?.QCCheckDetails
                                .FirstOrDefault(q => q.ReceiptDetailId == d.ReceiptDetailId)?.FailQuantityDamage ?? 0m
                        },
                        Notes = d.Notes,
                        EvidenceImages = d.EvidenceImages.Select(i => new IncidentEvidenceImage
                        {
                            Id = i.Id,
                            IncidentReportDetailId = i.IncidentReportDetailId,
                            ImageData = i.ImageData,
                            UploadedAt = i.UploadedAt,
                            UploadedByStaffId = i.UploadedByStaffId
                        }).ToList()
                    };
                }).ToList()
            };
        }

        #endregion

        #region Accountant Methods

        public async Task<AccountantReceiptCloseResultDto> CloseReceiptAsync(long receiptId, AccountantReceiptCloseDto dto, int accountantId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status != "Stamped")
                throw new InvalidOperationException("Phiếu nhập chưa được Thủ kho đóng dấu");

            var now = DateTime.UtcNow;
            receipt.Status = "Closed";
            receipt.AccountingNote = dto.AccountingNote;
            receipt.ClosedByAccountantId = accountantId;
            receipt.ClosedAt = now;

            await _context.SaveChangesAsync();

            var qcCheck = await _context.QCChecks
                .Where(q => q.ReceiptId == receiptId)
                .OrderByDescending(q => q.CheckedAt)
                .FirstOrDefaultAsync();

            var qcDetails = qcCheck == null
                ? new List<QCCheckDetail>()
                : await _context.QCCheckDetails
                    .Include(d => d.ReceiptDetail)
                    .Where(d => d.QCCheckId == qcCheck.QCCheckId)
                    .ToListAsync();

            var batchCodes = await _context.ReceiptDetailBinAllocations
                .Include(a => a.Batch)
                .Where(a => a.ReceiptDetail.ReceiptId == receiptId)
                .Select(a => a.Batch.BatchCode)
                .Distinct()
                .ToListAsync();

            var totalQuantity = qcDetails.Sum(d => d.PassQuantity);
            var totalValue = qcDetails.Sum(d => d.PassQuantity * (d.ReceiptDetail.UnitPrice ?? 0));

            var userMap = await BuildUserNameMapAsync(accountantId);
            var accountantName = ResolveUserName(userMap, accountantId);

            return new AccountantReceiptCloseResultDto
            {
                ReceiptId = receiptId,
                Status = receipt.Status ?? string.Empty,
                ClosedBy = accountantName,
                ClosedAt = receipt.ClosedAt,
                Summary = new AccountantReceiptCloseSummaryDto
                {
                    PurchaseOrderCode = receipt.PurchaseOrder?.PurchaseOrderCode,
                    SupplierName = receipt.PurchaseOrder?.Supplier?.Name,
                    TotalItems = receipt.ReceiptDetails.Count,
                    TotalQuantity = totalQuantity,
                    BatchCodes = batchCodes,
                    TotalValue = totalValue
                }
            };
        }

        #endregion

        #region Helper Methods

        private async Task<Dictionary<int, string>> BuildUserNameMapAsync(params int?[] userIds)
        {
            var id = userIds.Where(id => id.HasValue)
                            .Select(id => id!.Value)
                            .Distinct()
                            .ToList();

            if (!id.Any())
                return new Dictionary<int, string>();

            return await _context.Users
                .Where(u => id.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.FullName ?? u.Email ?? $"User {u.UserId}");
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

        private async Task<decimal> GetAccumulatedPassQtyForPoAsync(long purchaseOrderId, long? excludeReceiptId = null)
        {
            var latestQcIds = await _context.QCChecks
                .Where(q => q.Receipt.PurchaseOrderId == purchaseOrderId
                         && (!excludeReceiptId.HasValue || q.ReceiptId != excludeReceiptId.Value))
                .GroupBy(q => q.ReceiptId)
                .Select(g => g.OrderByDescending(x => x.CheckedAt)
                    .Select(x => x.QCCheckId)
                    .First())
                .ToListAsync();

            if (latestQcIds.Count == 0)
                return 0m;

            return await _context.QCCheckDetails
                .Where(d => latestQcIds.Contains(d.QCCheckId))
                .SumAsync(d => (decimal?)d.PassQuantity) ?? 0m;
        }

        private static string? ResolveUserName(Dictionary<int, string> userMap, int? userId)
        {
            if (!userId.HasValue) return null;
            return userMap.TryGetValue(userId.Value, out var name) ? name : null;
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateRoleNotificationsAsync(string roleName, string message, string entityType, long? entityId)
        {
            var userIds = await GetUserIdsByRoleAsync(roleName);
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

        #endregion

###

        public async Task<StockShortageDetectResultDto> DetectShortagesAsync(int? warehouseId = null)
        {
            var activeStatuses = new[] { "Pending", "ManagerConfirmed", "PRCreated" };

            var activeAlerts = await _context.StockShortageAlerts
                .Where(a => activeStatuses.Contains(a.Status))
                .ToListAsync();

            var activeAlertMap = activeAlerts
                .ToDictionary(a => (a.MaterialId, a.WarehouseId));

            var inventoryQuery = _context.InventoryCurrents.AsQueryable();
            if (warehouseId.HasValue)
                inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);

            var inventoryGroups = await inventoryQuery
                .GroupBy(i => new { i.MaterialId, i.WarehouseId })
                .Select(g => new
                {
                    g.Key.MaterialId,
                    g.Key.WarehouseId,
                    QuantityOnHand = g.Sum(x => x.QuantityOnHand ?? 0)
                })
                .ToListAsync();

            var materialMap = await _context.Materials
                .Where(m => m.MinStockLevel.HasValue)
                .ToDictionaryAsync(m => m.MaterialId, m => m);

            var now = DateTime.UtcNow;
            var newAlerts = new List<StockShortageAlert>();
            var updatedAlerts = 0;

            foreach (var group in inventoryGroups)
            {

                if (!materialMap.TryGetValue(group.MaterialId, out var material))
                    continue;

                var minStock = material.MinStockLevel ?? 0;
                if (group.QuantityOnHand >= minStock)
                    continue;

                var suggestedQuantity = CalculateSuggestedQuantity(material, group.QuantityOnHand);
                var priority = CalculatePriority(group.QuantityOnHand, minStock);

                var key = (group.MaterialId, group.WarehouseId);
                if (activeAlertMap.TryGetValue(key, out var existingAlert))
                {
                    var hasChanges = false;

                    if (existingAlert.CurrentQuantity != group.QuantityOnHand)
                    {
                        existingAlert.CurrentQuantity = group.QuantityOnHand;
                        hasChanges = true;
                    }

                    if (existingAlert.MinStockLevel != material.MinStockLevel)
                    {
                        existingAlert.MinStockLevel = material.MinStockLevel;
                        hasChanges = true;
                    }

                    if (existingAlert.SuggestedQuantity != suggestedQuantity)
                    {
                        existingAlert.SuggestedQuantity = suggestedQuantity;
                        hasChanges = true;
                    }

                    if (existingAlert.Priority != priority)
                    {
                        existingAlert.Priority = priority;
                        hasChanges = true;
                    }

                    if (hasChanges)
                        updatedAlerts++;

                    continue;
                }

                var alert = new StockShortageAlert
                {
                    MaterialId = group.MaterialId,
                    WarehouseId = group.WarehouseId,
                    CurrentQuantity = group.QuantityOnHand,
                    MinStockLevel = material.MinStockLevel,
                    SuggestedQuantity = suggestedQuantity,
                    Priority = priority,
                    Status = "Pending",
                    CreatedAt = now
                };

                newAlerts.Add(alert);
            }

            if (newAlerts.Count > 0)
                _context.StockShortageAlerts.AddRange(newAlerts);

            if (newAlerts.Count > 0 || updatedAlerts > 0)
                await _context.SaveChangesAsync();

            if (newAlerts.Count > 0)
                await CreateManagerNotificationsAsync(newAlerts, materialMap, now);

            return new StockShortageDetectResultDto
            {
                TotalScanned = inventoryGroups.Count,
                NewAlerts = newAlerts.Count,
                UpdatedAlerts = updatedAlerts,
                Alerts = newAlerts
            };
        }

        public Task<StockShortageDetectResultDto> CalculateStockShortageAsync(int? warehouseId = null)
        {
            return DetectShortagesAsync(warehouseId);
        }

        public async Task<StockShortageAlert> ConfirmAlertAsync(long alertId, int managerId, decimal? adjustedQuantity, string? notes)
        {
            var alert = await _context.StockShortageAlerts
                .Include(a => a.Material)
                .Include(a => a.Warehouse)
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null)
                throw new KeyNotFoundException($"Alert with ID {alertId} not found");

            if (alert.Status == "ManagerConfirmed")
                throw new InvalidOperationException("Alert is already confirmed by manager");

            alert.Status = "ManagerConfirmed";
            alert.ConfirmedBy = managerId;
            alert.ConfirmedAt = DateTime.UtcNow;

            if (adjustedQuantity.HasValue)
                alert.SuggestedQuantity = adjustedQuantity.Value;

            if (!string.IsNullOrWhiteSpace(notes))
                alert.Notes = notes;

            await CreateAdminNotificationsAsync(alert, DateTime.UtcNow);
            await _context.SaveChangesAsync();

            return alert;
        }

        private static decimal? CalculateSuggestedQuantity(Material material, decimal currentQuantity)
        {
            if (material.MaxStockLevel.HasValue && material.MaxStockLevel.Value > currentQuantity)
            {
                return material.MaxStockLevel.Value - currentQuantity;
            }

            if (material.MinStockLevel.HasValue && material.MinStockLevel.Value > currentQuantity)
            {
                return material.MinStockLevel.Value - currentQuantity;
            }

            return null;
        }

        private static string? CalculatePriority(decimal currentQuantity, decimal minStockLevel)
        {
            if (minStockLevel <= 0)
                return null;

            if (currentQuantity == 0)
                return "Critical";

            var half = minStockLevel * 0.5m;
            if (currentQuantity < half)
                return "High";

            if (currentQuantity < minStockLevel)
                return "Medium";

            return null;
        }

        private async Task CreateManagerNotificationsAsync(
            List<StockShortageAlert> alerts,
            Dictionary<int, Material> materialMap,
            DateTime now)
        {
            var managerIds = await GetUserIdsByRoleAsync("Manager");
            if (managerIds.Count == 0)
                return;

            foreach (var alert in alerts)
            {
                var materialName = materialMap.TryGetValue(alert.MaterialId, out var material)
                    ? material.Name
                    : $"Material {alert.MaterialId}";

                var message = $"New stock shortage alert for {materialName}.";
                if (alert.WarehouseId.HasValue)
                    message += $" Warehouse {alert.WarehouseId}.";

                foreach (var managerId in managerIds)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = managerId,
                        Message = message,
                        RelatedEntityType = "StockShortageAlert",
                        RelatedEntityId = alert.AlertId,
                        IsRead = false,
                        CreatedAt = now
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task CreateAdminNotificationsAsync(StockShortageAlert alert, DateTime now)
        {
            var adminIds = await GetUserIdsByRoleAsync("Admin");
            if (adminIds.Count == 0)
                return;

            var materialName = alert.Material?.Name ?? $"Material {alert.MaterialId}";
            var message = $"Alert {alert.AlertId} for {materialName} was confirmed by manager.";

            foreach (var adminId in adminIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = adminId,
                    Message = message,
                    RelatedEntityType = "StockShortageAlert",
                    RelatedEntityId = alert.AlertId,
                    IsRead = false,
                    CreatedAt = now
                });
            }
        }

###

        public async Task<StockShortageDetectResultDto> DetectShortagesAsync(int? warehouseId = null)
        {
            var activeStatuses = new[] { "Pending", "ManagerConfirmed", "PRCreated" };

            var activeAlerts = await _context.StockShortageAlerts
                .Where(a => activeStatuses.Contains(a.Status))
                .ToListAsync();

            var activeAlertMap = activeAlerts
                .ToDictionary(a => (a.MaterialId, a.WarehouseId));

            var inventoryQuery = _context.InventoryCurrents.AsQueryable();
            if (warehouseId.HasValue)
                inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);

            var inventoryGroups = await inventoryQuery
                .GroupBy(i => new { i.MaterialId, i.WarehouseId })
                .Select(g => new
                {
                    g.Key.MaterialId,
                    g.Key.WarehouseId,
                    QuantityOnHand = g.Sum(x => x.QuantityOnHand ?? 0)
                })
                .ToListAsync();

            var materialMap = await _context.Materials
                .Where(m => m.MinStockLevel.HasValue)
                .ToDictionaryAsync(m => m.MaterialId, m => m);

            var now = DateTime.UtcNow;
            var newAlerts = new List<StockShortageAlert>();
            var updatedAlerts = 0;

            foreach (var group in inventoryGroups)
            {

                if (!materialMap.TryGetValue(group.MaterialId, out var material))
                    continue;

                var minStock = material.MinStockLevel ?? 0;
                if (group.QuantityOnHand >= minStock)
                    continue;

                var suggestedQuantity = CalculateSuggestedQuantity(material, group.QuantityOnHand);
                var priority = CalculatePriority(group.QuantityOnHand, minStock);

                var key = (group.MaterialId, group.WarehouseId);
                if (activeAlertMap.TryGetValue(key, out var existingAlert))
                {
                    var hasChanges = false;

                    if (existingAlert.CurrentQuantity != group.QuantityOnHand)
                    {
                        existingAlert.CurrentQuantity = group.QuantityOnHand;
                        hasChanges = true;
                    }

                    if (existingAlert.MinStockLevel != material.MinStockLevel)
                    {
                        existingAlert.MinStockLevel = material.MinStockLevel;
                        hasChanges = true;
                    }

                    if (existingAlert.SuggestedQuantity != suggestedQuantity)
                    {
                        existingAlert.SuggestedQuantity = suggestedQuantity;
                        hasChanges = true;
                    }

                    if (existingAlert.Priority != priority)
                    {
                        existingAlert.Priority = priority;
                        hasChanges = true;
                    }

                    if (hasChanges)
                        updatedAlerts++;

                    continue;
                }

                var alert = new StockShortageAlert
                {
                    MaterialId = group.MaterialId,
                    WarehouseId = group.WarehouseId,
                    CurrentQuantity = group.QuantityOnHand,
                    MinStockLevel = material.MinStockLevel,
                    SuggestedQuantity = suggestedQuantity,
                    Priority = priority,
                    Status = "Pending",
                    CreatedAt = now
                };

                newAlerts.Add(alert);
            }

            if (newAlerts.Count > 0)
                _context.StockShortageAlerts.AddRange(newAlerts);

            if (newAlerts.Count > 0 || updatedAlerts > 0)
                await _context.SaveChangesAsync();

            if (newAlerts.Count > 0)
                await CreateManagerNotificationsAsync(newAlerts, materialMap, now);

            return new StockShortageDetectResultDto
            {
                TotalScanned = inventoryGroups.Count,
                NewAlerts = newAlerts.Count,
                UpdatedAlerts = updatedAlerts,
                Alerts = newAlerts
            };
        }

        public Task<StockShortageDetectResultDto> CalculateStockShortageAsync(int? warehouseId = null)
        {
            return DetectShortagesAsync(warehouseId);
        }

        public async Task<StockShortageAlert> ConfirmAlertAsync(long alertId, int managerId, decimal? adjustedQuantity, string? notes)
        {
            var alert = await _context.StockShortageAlerts
                .Include(a => a.Material)
                .Include(a => a.Warehouse)
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null)
                throw new KeyNotFoundException($"Alert with ID {alertId} not found");

            if (alert.Status == "ManagerConfirmed")
                throw new InvalidOperationException("Alert is already confirmed by manager");

            alert.Status = "ManagerConfirmed";
            alert.ConfirmedBy = managerId;
            alert.ConfirmedAt = DateTime.UtcNow;

            if (adjustedQuantity.HasValue)
                alert.SuggestedQuantity = adjustedQuantity.Value;

            if (!string.IsNullOrWhiteSpace(notes))
                alert.Notes = notes;

            await CreateAdminNotificationsAsync(alert, DateTime.UtcNow);
            await _context.SaveChangesAsync();

            return alert;
        }

        private static decimal? CalculateSuggestedQuantity(Material material, decimal currentQuantity)
        {
            if (material.MaxStockLevel.HasValue && material.MaxStockLevel.Value > currentQuantity)
            {
                return material.MaxStockLevel.Value - currentQuantity;
            }

            if (material.MinStockLevel.HasValue && material.MinStockLevel.Value > currentQuantity)
            {
                return material.MinStockLevel.Value - currentQuantity;
            }

            return null;
        }

        private static string? CalculatePriority(decimal currentQuantity, decimal minStockLevel)
        {
            if (minStockLevel <= 0)
                return null;

            if (currentQuantity == 0)
                return "Critical";

            var half = minStockLevel * 0.5m;
            if (currentQuantity < half)
                return "High";

            if (currentQuantity < minStockLevel)
                return "Medium";

            return null;
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateManagerNotificationsAsync(
            List<StockShortageAlert> alerts,
            Dictionary<int, Material> materialMap,
            DateTime now)
        {
            var managerIds = await GetUserIdsByRoleAsync("Manager");
            if (managerIds.Count == 0)
                return;

            foreach (var alert in alerts)
            {
                var materialName = materialMap.TryGetValue(alert.MaterialId, out var material)
                    ? material.Name
                    : $"Material {alert.MaterialId}";

                var message = $"New stock shortage alert for {materialName}.";
                if (alert.WarehouseId.HasValue)
                    message += $" Warehouse {alert.WarehouseId}.";

                foreach (var managerId in managerIds)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = managerId,
                        Message = message,
                        RelatedEntityType = "StockShortageAlert",
                        RelatedEntityId = alert.AlertId,
                        IsRead = false,
                        CreatedAt = now
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task CreateAdminNotificationsAsync(StockShortageAlert alert, DateTime now)
        {
            var adminIds = await GetUserIdsByRoleAsync("Admin");
            if (adminIds.Count == 0)
                return;

            var materialName = alert.Material?.Name ?? $"Material {alert.MaterialId}";
            var message = $"Alert {alert.AlertId} for {materialName} was confirmed by manager.";

            foreach (var adminId in adminIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = adminId,
                    Message = message,
                    RelatedEntityType = "StockShortageAlert",
                    RelatedEntityId = alert.AlertId,
                    IsRead = false,
                    CreatedAt = now
                });
            }
        }

###
