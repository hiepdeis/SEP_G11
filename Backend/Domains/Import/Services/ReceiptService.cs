using Backend.Data;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Backend.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly MyDbContext _context;
        private readonly INotificationDispatcher _notificationDispatcher;
        public ReceiptService(MyDbContext context, INotificationDispatcher notificationDispatcher)
        {
            _context = context;
            _notificationDispatcher = notificationDispatcher;
        }



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
                var costUpdateItems = new List<MaterialCostUpdateItem>();

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

                    if (item.ActualQuantity > 0)
                    {
                        costUpdateItems.Add(new MaterialCostUpdateItem
                        {
                            MaterialId = detail.MaterialId,
                            ActualQuantity = item.ActualQuantity,
                            UnitPrice = detail.UnitPrice ?? 0m
                        });
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

                if (costUpdateItems.Count > 0)
                    await UpdateMaterialAverageCostAsync(costUpdateItems);

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

                // Prevent duplicate receipt creation for the same source.
                if (dto.SupplementaryReceiptId.HasValue)
                {
                    var hasExistingSupplementaryReceipt = await _context.Receipts
                        .AnyAsync(r => r.SupplementaryReceiptId == dto.SupplementaryReceiptId.Value);

                    if (hasExistingSupplementaryReceipt)
                        throw new InvalidOperationException(
                            $"Receipt đã tồn tại cho phiếu bổ sung {dto.SupplementaryReceiptId.Value}");
                }
                else
                {
                    var hasExistingPoReceipt = await _context.Receipts
                        .AnyAsync(r => r.PurchaseOrderId == dto.PurchaseOrderId && r.SupplementaryReceiptId == null);

                    if (hasExistingPoReceipt)
                        throw new InvalidOperationException(
                            $"Receipt đã tồn tại với PO {dto.PurchaseOrderId}");
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

        public async Task<PendingPurchaseOrderDto> GetPendingPurchaseOrderDetailAsync(long purchaseOrderId)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .Where(o => o.PurchaseOrderId == purchaseOrderId)
                .Where(o => o.Status == "SentToSupplier" && o.ExpectedDeliveryDate.HasValue)
                .Where(o => !_context.Receipts.Any(r => r.PurchaseOrderId == o.PurchaseOrderId))
                .FirstOrDefaultAsync();

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"Pending purchase order with ID {purchaseOrderId} not found");

            return new PendingPurchaseOrderDto
            {
                Type = "NewDelivery",
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                PoCode = purchaseOrder.PurchaseOrderCode,
                SupplierName = purchaseOrder.Supplier?.Name ?? string.Empty,
                ExpectedDeliveryDate = purchaseOrder.ExpectedDeliveryDate!.Value,
                SupplierNote = purchaseOrder.SupplierNote,
                Items = purchaseOrder.Items.Select(i => new PendingPurchaseOrderItemDto
                {
                    MaterialId = i.MaterialId,
                    MaterialName = i.Material?.Name ?? string.Empty,
                    MaterialCode = i.Material?.Code ?? string.Empty,
                    OrderedQuantity = i.OrderedQuantity,
                    Unit = i.Material?.Unit ?? string.Empty,
                    IsDecimalUnit = i.Material?.IsDecimalUnit ?? false
                }).ToList()
            };
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
                var costUpdateItems = new List<MaterialCostUpdateItem>();
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

                    if (totalAllocation > 0)
                    {
                        costUpdateItems.Add(new MaterialCostUpdateItem
                        {
                            MaterialId = item.MaterialId,
                            ActualQuantity = totalAllocation,
                            UnitPrice = receiptDetail.UnitPrice ?? 0m
                        });
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

                if (costUpdateItems.Count > 0)
                    await UpdateMaterialAverageCostAsync(costUpdateItems);

                await transaction.CommitAsync();

                if (receipt.Status == "ReadyForStamp")
                {
                    await _notificationDispatcher.DispatchToRoleAsync(new NotificationRoleDispatchRequest
                    {
                        RoleName = "WarehouseManager",
                        FallbackRoleName = "Admin",
                        OnlyActiveUsers = true,
                        Message = $"Phiếu nhập kho {receipt.ReceiptCode} đã sẵn sàng để đóng dấu",
                        RelatedEntityType = "Receipt",
                        RelatedEntityId = receipt.ReceiptId,
                        SendEmail = true,
                        SaveChanges = true
                    }, CancellationToken.None);
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

            // Notify Kế toán về phiếu đã được đóng dấu
            var userMap = await BuildUserNameMapAsync(managerId);
            var managerName = ResolveUserName(userMap, managerId);

            await _notificationDispatcher.DispatchToRoleAsync(new NotificationRoleDispatchRequest
            {
                RoleName = "Accountant",
                FallbackRoleName = "Admin",
                OnlyActiveUsers = true,
                Message = $"Phiếu nhập kho {receipt.ReceiptCode} đã được đóng dấu bởi {managerName}",
                RelatedEntityType = "Receipt",
                RelatedEntityId = receipt.ReceiptId,
                SendEmail = true,
                SaveChanges = true
            }, CancellationToken.None);

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

        public async Task<IncidentReportDto> GetIncidentReportByReceiptAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var incident = await _context.IncidentReports
                .Include(i => i.IncidentReportDetails)
                    .ThenInclude(d => d.Material)
                .Include(i => i.IncidentReportDetails)
                    .ThenInclude(d => d.EvidenceImages)
                .Include(i => i.QCCheck)
                    .ThenInclude(q => q!.QCCheckDetails)
                .Include(i => i.CreatedByNavigation)
                .Include(i => i.ResolvedByNavigation)
                .FirstOrDefaultAsync(i => i.ReceiptId == receiptId);

            if (incident == null)
                throw new KeyNotFoundException($"No incident report found for receipt ID {receiptId}");

            return MapIncidentReportToDto(
                incident,
                receipt.ReceiptCode,
                receipt.ReceiptDetails,
                incident.QCCheck,
                incident.CreatedByNavigation?.FullName ?? incident.CreatedByNavigation?.Email,
                incident.ResolvedByNavigation?.FullName ?? incident.ResolvedByNavigation?.Email);
        }

        public async Task<List<IncidentReportSummaryDto>> GetAllIncidentReportsAsync()
        {
            return await _context.IncidentReports
                .Include(i => i.Receipt)
                    .ThenInclude(r => r.Warehouse)
                .Include(i => i.CreatedByNavigation)
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new IncidentReportSummaryDto
                {
                    IncidentId = i.IncidentId,
                    IncidentCode = i.IncidentCode,
                    ReceiptId = i.ReceiptId,
                    ReceiptCode = i.Receipt.ReceiptCode,
                    WarehouseName = i.Receipt.Warehouse != null ? i.Receipt.Warehouse.Name : null,
                    CreatedAt = i.CreatedAt,
                    CreatedBy = i.CreatedBy,
                    CreatedByName = i.CreatedByNavigation.FullName ?? i.CreatedByNavigation.Email,
                    Description = i.Description,
                    Status = i.Status,
                    TotalItems = i.IncidentReportDetails.Select(d => d.ReceiptDetailId).Distinct().Count()
                })
                .ToListAsync();
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

        public async Task<List<AccountantReceiptSummaryDto>> GetReceiptsForAccountantAsync(string? status)
        {
            var targetStatus = string.IsNullOrWhiteSpace(status) ? "Stamped" : status;

            var receipts = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.ReceiptDetails)
                .Where(r => r.Status == targetStatus || r.Status == "Closed")
                .OrderByDescending(r => r.StampedAt ?? r.ReceiptDate ?? r.ConfirmedAt ?? r.ApprovedAt)
                .ToListAsync();

            if (receipts.Count == 0)
                return new List<AccountantReceiptSummaryDto>();

            var receiptIds = receipts.Select(r => r.ReceiptId).ToList();

            var latestQcIds = await _context.QCChecks
                .Where(q => receiptIds.Contains(q.ReceiptId))
                .GroupBy(q => q.ReceiptId)
                .Select(g => new
                {
                    ReceiptId = g.Key,
                    QCCheckId = g.OrderByDescending(x => x.CheckedAt)
                        .Select(x => x.QCCheckId)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var qcIdSet = latestQcIds.Select(x => x.QCCheckId).ToHashSet();

            var qcDetails = await _context.QCCheckDetails
                .Include(d => d.ReceiptDetail)
                .Where(d => qcIdSet.Contains(d.QCCheckId))
                .ToListAsync();

            var totalValueMap = qcDetails
                .GroupBy(d => d.ReceiptDetail.ReceiptId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(x => x.PassQuantity * (x.ReceiptDetail.UnitPrice ?? 0)));

            return receipts.Select(r => new AccountantReceiptSummaryDto
            {
                ReceiptId = r.ReceiptId,
                ReceiptCode = r.ReceiptCode,
                Status = r.Status ?? string.Empty,
                PurchaseOrderCode = r.PurchaseOrder?.PurchaseOrderCode,
                SupplierName = r.PurchaseOrder?.Supplier?.Name,
                TotalValue = totalValueMap.TryGetValue(r.ReceiptId, out var totalValue) ? totalValue : 0m,
                StampedAt = r.StampedAt
            }).ToList();
        }

        public async Task<AccountantReceiptDetailDto> GetReceiptForAccountantAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                // .Include(r => r.PurchaseOrder)
                //     .ThenInclude(o => o!.Project)
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Supplier)
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o!.Items)
                        .ThenInclude(i => i.Material)
                .Include(r => r.Warehouse)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.QCChecks)
                    .ThenInclude(q => q.CheckedByNavigation)
                .Include(r => r.QCChecks)
                    .ThenInclude(q => q.QCCheckDetails)
                        .ThenInclude(d => d.ReceiptDetail)
                            .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var qcCheck = receipt.QCChecks
                .OrderByDescending(q => q.CheckedAt)
                .FirstOrDefault();

            var qcDto = qcCheck == null
                ? null
                : MapQCCheckToDto(qcCheck, receipt.ReceiptCode, receipt.ReceiptDetails,
                    qcCheck.CheckedByNavigation != null
                        ? qcCheck.CheckedByNavigation.FullName ?? qcCheck.CheckedByNavigation.Email
                        : null);

            var materialIds = receipt.ReceiptDetails
                .Select(rd => rd.MaterialId)
                .Distinct()
                .ToList();

            var inventoryCurrents = await _context.InventoryCurrents
                .Include(i => i.Material)
                .Include(i => i.Bin)
                .Include(i => i.Batch)
                .Where(i => i.WarehouseId == receipt.WarehouseId)
                .Where(i => materialIds.Contains(i.MaterialId))
                .Select(i => new AccountantInventoryCurrentDto
                {
                    WarehouseId = i.WarehouseId ?? 0,
                    MaterialId = i.MaterialId,
                    MaterialName = i.Material != null ? i.Material.Name : null,
                    BinId = i.BinId,
                    BinCode = i.Bin != null ? i.Bin.Code : null,
                    BatchId = i.BatchId,
                    BatchCode = i.Batch != null ? i.Batch.BatchCode : null,
                    QuantityOnHand = i.QuantityOnHand ?? 0,
                    LastUpdated = i.LastUpdated
                })
                .ToListAsync();

            var warehouseCards = await _context.WarehouseCards
                .Include(w => w.Warehouse)
                .Include(w => w.Material)
                .Include(w => w.Bin)
                .Include(w => w.Batch)
                .Include(w => w.CreatedByNavigation)
                .Where(w => w.ReferenceType == "Receipt" && w.ReferenceId == receiptId)
                .OrderByDescending(w => w.TransactionDate)
                .Select(w => new WarehouseCardDto
                {
                    CardId = w.CardId,
                    CardCode = w.CardCode,
                    WarehouseId = w.WarehouseId,
                    WarehouseName = w.Warehouse != null ? w.Warehouse.Name : null,
                    MaterialId = w.MaterialId,
                    MaterialCode = w.Material != null ? w.Material.Code : null,
                    MaterialName = w.Material != null ? w.Material.Name : null,
                    MaterialUnit = w.Material != null ? w.Material.Unit : null,
                    BinId = w.BinId,
                    BinCode = w.Bin != null ? w.Bin.Code : null,
                    BatchId = w.BatchId,
                    BatchCode = w.Batch != null ? w.Batch.BatchCode : null,
                    TransactionType = w.TransactionType,
                    ReferenceId = w.ReferenceId,
                    ReferenceType = w.ReferenceType,
                    TransactionDate = w.TransactionDate,
                    Quantity = w.Quantity,
                    QuantityBefore = w.QuantityBefore,
                    QuantityAfter = w.QuantityAfter,
                    CreatedBy = w.CreatedBy,
                    CreatedByName = w.CreatedByNavigation != null
                        ? w.CreatedByNavigation.FullName ?? w.CreatedByNavigation.Email
                        : null,
                    Notes = w.Notes
                })
                .ToListAsync();

            var purchaseOrder = receipt.PurchaseOrder;
            var purchaseOrderUserNames = purchaseOrder == null
                ? new Dictionary<int, string>()
                : await BuildUserNameMapAsync(
                    purchaseOrder.CreatedBy,
                    purchaseOrder.AccountantApprovedBy,
                    purchaseOrder.AdminApprovedBy);

            var receiptUserNames = await BuildUserNameMapAsync(receipt.StampedByManagerId);

            return new AccountantReceiptDetailDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                Status = receipt.Status ?? string.Empty,
                ReceiptDate = receipt.ReceiptDate,
                StampedAt = receipt.StampedAt,
                StampedByName = ResolveUserName(receiptUserNames, receipt.StampedByManagerId),
                PurchaseOrder = purchaseOrder == null ? null : PurchaseOrderMapper.ToDto(purchaseOrder, purchaseOrderUserNames),
                QCCheck = qcDto,
                InventoryCurrents = inventoryCurrents,
                WarehouseCards = warehouseCards
            };
        }

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

        private sealed class MaterialCostUpdateItem
        {
            public int MaterialId { get; init; }
            public decimal ActualQuantity { get; init; }
            public decimal UnitPrice { get; init; }
        }

        private async Task UpdateMaterialAverageCostAsync(IEnumerable<MaterialCostUpdateItem> importedItems)
        {
            if (importedItems == null)
                throw new ArgumentNullException(nameof(importedItems));

            var groupedItems = importedItems
                .Where(i => i.MaterialId > 0 && i.ActualQuantity > 0)
                .GroupBy(i => i.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    TotalImportedQuantity = g.Sum(x => x.ActualQuantity),
                    TotalImportedValue = g.Sum(x => x.ActualQuantity * x.UnitPrice)
                })
                .Where(x => x.TotalImportedQuantity > 0)
                .ToList();

            if (!groupedItems.Any())
                return;

            var materialIds = groupedItems.Select(x => x.MaterialId).ToList();

            var ownsTransaction = _context.Database.CurrentTransaction == null;
            await using var localTransaction = ownsTransaction
                ? await _context.Database.BeginTransactionAsync()
                : null;

            try
            {
                var materialMap = await _context.Materials
                    .Where(m => materialIds.Contains(m.MaterialId))
                    .ToDictionaryAsync(m => m.MaterialId, m => m);

                var inventoryTotals = await _context.InventoryCurrents
                    .Where(i => materialIds.Contains(i.MaterialId))
                    .GroupBy(i => i.MaterialId)
                    .Select(g => new
                    {
                        MaterialId = g.Key,
                        QuantityOnHand = g.Sum(x => x.QuantityOnHand ?? 0m)
                    })
                    .ToDictionaryAsync(x => x.MaterialId, x => x.QuantityOnHand);

                foreach (var item in groupedItems)
                {
                    if (!materialMap.TryGetValue(item.MaterialId, out var material))
                        throw new KeyNotFoundException($"Material with ID {item.MaterialId} not found");

                    var stockAfterImport = inventoryTotals.TryGetValue(item.MaterialId, out var qty)
                        ? qty
                        : 0m;

                    var currentStock = stockAfterImport - item.TotalImportedQuantity;
                    if (currentStock < 0)
                        currentStock = 0;

                    // TODO: Rename UnitPrice if your Material average cost column uses a different name (e.g., AveragePrice).
                    var currentAverageCost = material.UnitPrice ?? 0m;
                    var oldTotalValue = currentStock * currentAverageCost;
                    var newTotalValue = item.TotalImportedValue;
                    var totalQuantity = currentStock + item.TotalImportedQuantity;

                    if (totalQuantity <= 0)
                        continue;

                    var newAverageCost = (oldTotalValue + newTotalValue) / totalQuantity;

                    // TODO: Rename UnitPrice if your schema stores moving average cost under another field.
                    material.UnitPrice = newAverageCost;

                    // TODO: If Material stores on-hand quantity directly, add item.TotalImportedQuantity here.
                }

                await _context.SaveChangesAsync();

                if (ownsTransaction && localTransaction != null)
                    await localTransaction.CommitAsync();
            }
            catch
            {
                if (ownsTransaction && localTransaction != null)
                    await localTransaction.RollbackAsync();
                throw;
            }
        }

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

        private async Task<string> GenerateReceiptCodeAsync()
        {
            var today = DateTime.UtcNow;
            var prefix = $"RC{today:yyyyMMdd}"; // RC20250208

            // Get today's receipts count
            var count = await _context.Receipts
                .Where(r => r.ReceiptCode!.StartsWith(prefix))
                .CountAsync();

            // Format: RC20250208-0001
            return $"{prefix}-{(count + 1):D4}";
        }

        private async Task<string> GenerateQCCheckCodeAsync()
        {
            var today = DateTime.UtcNow;
            var codePrefix = $"QC-{today:yyyyMMdd}-";
            var lastQC = await _context.QCChecks
                .Where(q => q.QCCheckCode.StartsWith(codePrefix))
                .OrderByDescending(q => q.QCCheckId)
                .FirstOrDefaultAsync();

            var nextSeq = 1;
            if (lastQC != null)
            {
                var parts = lastQC.QCCheckCode.Split('-');
                if (parts.Length > 0 && int.TryParse(parts[^1], out var lastSeq))
                    nextSeq = lastSeq + 1;
            }

            return $"{codePrefix}{nextSeq:D4}";
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
    }
}
