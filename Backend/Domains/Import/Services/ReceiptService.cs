using Backend.Data;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Import.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly MyDbContext _context;
        public ReceiptService(MyDbContext context)
        {
            _context = context;
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
                            .Where(r => r.Status == "Approved" || r.Status == "GoodsArrived" || r.Status == "Completed")
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
                                    LineTotal = rd.Quantity * (rd.UnitPrice ?? 0)
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
                Items = receipt.ReceiptDetails.Select(rd => new GetInboundRequestItemDto
                {
                    DetailId = rd.DetailId,
                    MaterialId = rd.MaterialId,
                    MaterialCode = rd.Material != null ? rd.Material.Code : "",
                    MaterialName = rd.Material != null ? rd.Material.Name : "",
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
                    Unit = rd.Material?.Unit
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

                receipt.Status = "Completed";
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

        public async Task<ReceiveGoodsFromPoResultDto> ReceiveGoodsFromPOAsync(long purchaseOrderId, long? supplementaryReceiptId, List<ReceiveGoodsFromPoItemDto> items, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // STEP 1: basic validation
                if (items == null || items.Count == 0)
                    throw new ArgumentException("Items list cannot be empty");

                var purchaseOrder = await _context.PurchaseOrders
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Material)
                    .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

                if (purchaseOrder == null)
                    throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

                var allowedStatuses = new[] { "AdminApproved", "SentToSupplier" };
                if (!allowedStatuses.Contains(purchaseOrder.Status))
                    throw new InvalidOperationException(
                        $"Cannot receive goods for PO {purchaseOrderId} with status '{purchaseOrder.Status}'");

                // STEP 2: validate supplementary receipt if provided
                SupplementaryReceipt? supplementaryReceipt = null;
                if (supplementaryReceiptId.HasValue)
                {
                    supplementaryReceipt = await _context.SupplementaryReceipts
                        .FirstOrDefaultAsync(s => s.SupplementaryReceiptId == supplementaryReceiptId.Value);

                    if (supplementaryReceipt == null)
                        throw new KeyNotFoundException($"SupplementaryReceipt with ID {supplementaryReceiptId} not found");

                    if (supplementaryReceipt.PurchaseOrderId != purchaseOrderId)
                        throw new InvalidOperationException("Supplementary receipt does not belong to this purchase order");

                    if (supplementaryReceipt.Status != "Approved")
                        throw new InvalidOperationException("Supplementary receipt is not approved for receiving goods");
                }

                var warehouse = await _context.Warehouses
                    .OrderBy(w => w.WarehouseId)
                    .FirstOrDefaultAsync();

                if (warehouse == null)
                    throw new InvalidOperationException("No warehouse found to receive goods");

                var binLocation = await _context.BinLocations
                    .Where(b => b.WarehouseId == warehouse.WarehouseId)
                    .OrderBy(b => b.BinId)
                    .FirstOrDefaultAsync();

                if (binLocation == null)
                    throw new InvalidOperationException("No bin location found for receiving warehouse");

                var poItemMap = purchaseOrder.Items.ToDictionary(i => i.MaterialId, i => i);
                var requestedMaterialIds = items.Select(i => i.MaterialId).Distinct().ToList();

                var extraMaterials = requestedMaterialIds.Except(poItemMap.Keys).ToList();
                if (extraMaterials.Count > 0)
                    throw new ArgumentException("Receipt items contain materials not in PO");

                foreach (var item in items)
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
                    PurchaseOrderId = purchaseOrderId,
                    SupplementaryReceiptId = supplementaryReceiptId,
                    CreatedBy = staffId,
                    ReceiptDate = now,
                    Status = "PendingQC"
                };

                _context.Receipts.Add(receipt);
                await _context.SaveChangesAsync();

                decimal totalAmount = 0;
                foreach (var item in items)
                {
                    var poItem = poItemMap[item.MaterialId];
                    var batch = await GetOrCreateBatchAsync(item.MaterialId, null, null, null);
                    var lineTotal = item.ActualQuantity * (poItem.UnitPrice ?? 0);

                    var detail = new ReceiptDetail
                    {
                        ReceiptId = receipt.ReceiptId,
                        MaterialId = item.MaterialId,
                        SupplierId = poItem.SupplierId ?? purchaseOrder.SupplierId,
                        Quantity = poItem.OrderedQuantity,
                        ActualQuantity = item.ActualQuantity,
                        UnitPrice = poItem.UnitPrice,
                        LineTotal = lineTotal,
                        BinLocationId = binLocation.BinId,
                        BatchId = batch.BatchId
                    };

                    _context.ReceiptDetails.Add(detail);
                    totalAmount += lineTotal;
                }

                receipt.TotalAmount = totalAmount;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new ReceiveGoodsFromPoResultDto
                {
                    ReceiptId = receipt.ReceiptId,
                    PurchaseOrderId = purchaseOrderId,
                    SupplementaryReceiptId = supplementaryReceiptId,
                    Status = receipt.Status ?? "PendingQC",
                    NextStep = $"POST /api/staff/receipts/{receipt.ReceiptId}/qc-check"
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
            var orders = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .Where(o => o.Status == "SentToSupplier" && o.ExpectedDeliveryDate.HasValue)
                .OrderBy(o => o.ExpectedDeliveryDate)
                .ToListAsync();

            return orders.Select(o => new PendingPurchaseOrderDto
            {
                PurchaseOrderId = o.PurchaseOrderId,
                PoCode = o.PurchaseOrderCode,
                SupplierName = o.Supplier?.Name ?? string.Empty,
                ExpectedDeliveryDate = o.ExpectedDeliveryDate!.Value,
                Items = o.Items.Select(i => new PendingPurchaseOrderItemDto
                {
                    MaterialName = i.Material?.Name ?? string.Empty,
                    OrderedQuantity = i.OrderedQuantity,
                    Unit = i.Material?.Unit ?? string.Empty
                }).ToList()
            }).ToList();
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

            if (query.WarehouseId.HasValue)
                queryable = queryable.Where(w => w.WarehouseId == query.WarehouseId.Value);

            if (query.MaterialId.HasValue)
                queryable = queryable.Where(w => w.MaterialId == query.MaterialId.Value);

            if (query.BinId.HasValue)
                queryable = queryable.Where(w => w.BinId == query.BinId.Value);

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
            if (overallResult == "Pass")
            {
                // Apply pass quantities to inventory and warehouse cards
                foreach (var d in dto.Details)
                {
                    var detail = receiptDetailMap[d.MaterialId];
                    if (!detail.BinLocationId.HasValue || !detail.BatchId.HasValue)
                        throw new InvalidOperationException("BinLocationId and BatchId are required to update inventory");

                    var inventory = await _context.InventoryCurrents
                        .FirstOrDefaultAsync(i =>
                            i.WarehouseId == receipt.WarehouseId &&
                            i.MaterialId == detail.MaterialId &&
                            i.BinId == detail.BinLocationId &&
                            i.BatchId == detail.BatchId);

                    var qtyBefore = inventory?.QuantityOnHand ?? 0;
                    var qtyAfter = qtyBefore + d.PassQuantity;

                    if (inventory == null)
                    {
                        inventory = new InventoryCurrent
                        {
                            WarehouseId = receipt.WarehouseId,
                            MaterialId = detail.MaterialId,
                            BinId = detail.BinLocationId.Value,
                            BatchId = detail.BatchId.Value,
                            QuantityOnHand = d.PassQuantity,
                            LastUpdated = today
                        };
                        _context.InventoryCurrents.Add(inventory);
                    }
                    else
                    {
                        inventory.QuantityOnHand = qtyAfter;
                        inventory.LastUpdated = today;
                    }

                    var cardCode = await GenerateWarehouseCardCodeAsync(today);
                    var warehouseCard = new WarehouseCard
                    {
                        CardCode = cardCode,
                        WarehouseId = receipt.WarehouseId!.Value,
                        MaterialId = detail.MaterialId,
                        BinId = detail.BinLocationId.Value,
                        BatchId = detail.BatchId.Value,
                        TransactionType = "Import",
                        ReferenceId = receiptId,
                        ReferenceType = "Receipt",
                        TransactionDate = today,
                        Quantity = d.PassQuantity,
                        QuantityBefore = qtyBefore,
                        QuantityAfter = qtyAfter,
                        CreatedBy = staffId,
                        Notes = dto.Notes
                    };
                    _context.WarehouseCards.Add(warehouseCard);
                }

                receipt.Status = "Completed";

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
                        var totalPass = dto.Details.Sum(d => d.PassQuantity);

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
                    NextStep = string.Empty
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

        public async Task<IncidentReportDto> CreateIncidentReportAsync(long receiptId, CreateIncidentReportDto dto, int staffId)
        {
            // STEP 1: validate input
            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new ArgumentException("Description is required");

            // Validate IssueType values
            var validIssueTypes = new[] { "Quantity", "Quality", "Damage" };
            foreach (var d in dto.Details)
            {
                if (!validIssueTypes.Contains(d.IssueType))
                    throw new ArgumentException(
                        $"IssueType '{d.IssueType}' is invalid for MaterialId {d.MaterialId}. Must be: Quantity | Quality | Damage");

                if (d.PassQuantity < 0 || d.FailQuantity < 0 || d.OrderedQuantity < 0)
                    throw new ArgumentException(
                        $"Quantities must be non-negative for MaterialId {d.MaterialId}");
            }

            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status != "PendingIncident")
                throw new InvalidOperationException(
                    $"Cannot create incident report for receipt with status '{receipt.Status}'. Must be 'PendingIncident'");

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

            var invalidMaterials = dto.Details
                .Where(d => !receiptDetailMap.ContainsKey(d.MaterialId))
                .Select(d => d.MaterialId)
                .Distinct()
                .ToList();

            if (invalidMaterials.Any())
                throw new ArgumentException(
                    $"MaterialIds {string.Join(", ", invalidMaterials)} do not belong to receipt {receiptId}");

            // Link QC check from receipt (if any)
            var linkedQCCheck = await _context.QCChecks
                .FirstOrDefaultAsync(q => q.ReceiptId == receiptId && q.OverallResult == "Fail");

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

            var incident = new IncidentReport
            {
                IncidentCode = $"{prefix}{nextSeq:D4}",
                ReceiptId = receiptId,
                QCCheckId = linkedQCCheck?.QCCheckId,
                CreatedBy = staffId,
                CreatedAt = today,
                Description = dto.Description,
                Status = "Open",
                IncidentReportDetails = dto.Details.Select(d => new IncidentReportDetail
                {
                    ReceiptDetailId = receiptDetailMap[d.MaterialId].DetailId,
                    MaterialId = d.MaterialId,
                    ExpectedQuantity = d.OrderedQuantity,
                    ActualQuantity = d.PassQuantity + d.FailQuantity,
                    IssueType = d.IssueType,
                    Notes = d.Notes
                }).ToList()
            };

            _context.IncidentReports.Add(incident);

            // Receipt transitions to manager review once incident is created
            receipt.Status = "PendingManagerReview";

            await _context.SaveChangesAsync();

            // Notify warehouse manager about the new incident
            await CreateRoleNotificationsAsync(
                "Manager",
                $"New incident {incident.IncidentCode} requires manager review.",
                "IncidentReport",
                incident.IncidentId);

            // Load creator name
            var creator = await _context.Users.FindAsync(staffId);

            return MapIncidentReportToDto(
                incident,
                receipt.ReceiptCode,
                receipt.ReceiptDetails,
                linkedQCCheck,
                creator?.FullName ?? creator?.Email,
                null);
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
                .Include(i => i.QCCheck)
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
                    CreatedByName = i.CreatedByNavigation.FullName ?? i.CreatedByNavigation.Email,
                    Description = i.Description,
                    Status = i.Status,
                    TotalItems = i.IncidentReportDetails.Count
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
                        Notes = d.Notes
                    };
                }).ToList()
            };
        }

        #endregion

        #region Accountant Methods

        public async Task<List<AccountantReceiptSummaryDto>> GetReceiptsForAccountantAsync()
        {
            return await _context.Receipts
                .Include(r => r.PurchaseOrder)
                .Include(r => r.Warehouse)
                .Where(r => r.Status == "Completed")
                .OrderByDescending(r => r.ReceiptDate ?? r.ConfirmedAt ?? r.ApprovedAt)
                .Select(r => new AccountantReceiptSummaryDto
                {
                    ReceiptId = r.ReceiptId,
                    ReceiptCode = r.ReceiptCode,
                    Status = r.Status ?? string.Empty,
                    ReceiptDate = r.ReceiptDate,
                    PurchaseOrderId = r.PurchaseOrderId,
                    PurchaseOrderCode = r.PurchaseOrder != null ? r.PurchaseOrder.PurchaseOrderCode : null,
                    WarehouseName = r.Warehouse != null ? r.Warehouse.Name : null
                })
                .ToListAsync();
        }

        public async Task<AccountantReceiptDetailDto> GetReceiptForAccountantAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o.Project)
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o.Supplier)
                .Include(r => r.PurchaseOrder)
                    .ThenInclude(o => o.Items)
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
                    CreatedByName = w.CreatedByNavigation.FullName ?? w.CreatedByNavigation.Email,
                    Notes = w.Notes
                })
                .ToListAsync();

            return new AccountantReceiptDetailDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                Status = receipt.Status ?? string.Empty,
                ReceiptDate = receipt.ReceiptDate,
                PurchaseOrder = receipt.PurchaseOrder == null ? null : PurchaseOrderMapper.ToDto(receipt.PurchaseOrder),
                QCCheck = qcDto,
                InventoryCurrents = inventoryCurrents,
                WarehouseCards = warehouseCards
            };
        }

        public async Task CloseReceiptAsync(long receiptId, AccountantReceiptCloseDto dto, int accountantId)
        {
            var receipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            if (receipt.Status == "Closed")
                throw new InvalidOperationException("Receipt is already closed");

            if (receipt.Status != "Completed")
                throw new InvalidOperationException(
                    $"Cannot close receipt {receiptId}. Current status: {receipt.Status}");

            receipt.Status = "Closed";
            receipt.AccountantNotes = dto.AccountingNote;
            receipt.ClosedBy = accountantId;
            receipt.ClosedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
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

        private async Task<string> GenerateWarehouseCardCodeAsync(DateTime today)
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

            return $"{prefix}{nextSeq:D4}";
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
