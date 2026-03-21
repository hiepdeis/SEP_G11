using Backend.Data;
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

        public async Task<ReceiveGoodsFromPoResultDto> ReceiveGoodsFromPOAsync(long purchaseOrderId, List<ReceiveGoodsFromPoItemDto> items, int staffId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
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
                    CreatedBy = staffId,
                    ReceiptDate = now,
                    Status = "Completed"
                };

                _context.Receipts.Add(receipt);
                await _context.SaveChangesAsync();

                decimal totalAmount = 0;
                decimal totalActual = 0;

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
                    totalActual += item.ActualQuantity;

                    var inventory = await _context.InventoryCurrents
                        .FirstOrDefaultAsync(i =>
                            i.WarehouseId == warehouse.WarehouseId &&
                            i.MaterialId == item.MaterialId &&
                            i.BinId == binLocation.BinId &&
                            i.BatchId == batch.BatchId);

                    decimal qtyBefore = inventory?.QuantityOnHand ?? 0;
                    decimal qtyAfter = qtyBefore + item.ActualQuantity;

                    if (inventory == null)
                    {
                        inventory = new InventoryCurrent
                        {
                            WarehouseId = warehouse.WarehouseId,
                            MaterialId = item.MaterialId,
                            BinId = binLocation.BinId,
                            BatchId = batch.BatchId,
                            QuantityOnHand = item.ActualQuantity,
                            LastUpdated = now
                        };
                        _context.InventoryCurrents.Add(inventory);
                    }
                    else
                    {
                        inventory.QuantityOnHand = qtyAfter;
                        inventory.LastUpdated = now;
                    }

                    var cardCode = await GenerateWarehouseCardCodeAsync(now);
                    var warehouseCard = new WarehouseCard
                    {
                        CardCode = cardCode,
                        WarehouseId = warehouse.WarehouseId,
                        MaterialId = item.MaterialId,
                        BinId = binLocation.BinId,
                        BatchId = batch.BatchId,
                        TransactionType = "Import",
                        ReferenceId = receipt.ReceiptId,
                        ReferenceType = "Receipt",
                        TransactionDate = now,
                        Quantity = item.ActualQuantity,
                        QuantityBefore = qtyBefore,
                        QuantityAfter = qtyAfter,
                        CreatedBy = staffId
                    };
                    _context.WarehouseCards.Add(warehouseCard);
                }

                receipt.TotalAmount = totalAmount;

                var totalOrdered = purchaseOrder.Items.Sum(i => i.OrderedQuantity);
                var isPartialList = requestedMaterialIds.Count < poItemMap.Count;

                if (isPartialList)
                {
                    purchaseOrder.Status = "PartiallyReceived";
                }
                else if (totalActual == totalOrdered)
                {
                    purchaseOrder.Status = "FullyReceived";
                }
                else if (totalActual < totalOrdered)
                {
                    purchaseOrder.Status = "PartiallyReceived";
                }
                else
                {
                    purchaseOrder.Status = "OverReceived";
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new ReceiveGoodsFromPoResultDto
                {
                    ReceiptId = receipt.ReceiptId,
                    PurchaseOrderId = purchaseOrderId,
                    PoStatus = purchaseOrder.Status,
                    ActualQuantity = totalActual,
                    OrderedQuantity = totalOrdered
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
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

        public async Task<QCCheckDto> SubmitQCCheckAsync(long receiptId, SubmitQCCheckDto dto, int staffId)
        {
            // Validate result values
            var validResults = new[] { "Pass", "Fail" };
            if (!validResults.Contains(dto.OverallResult))
                throw new ArgumentException("OverallResult must be 'Pass' or 'Fail'");

            foreach (var d in dto.Details)
            {
                if (!validResults.Contains(d.Result))
                    throw new ArgumentException($"Detail result for ReceiptDetailId {d.ReceiptDetailId} must be 'Pass' or 'Fail'");

                if (d.Result == "Fail" && string.IsNullOrWhiteSpace(d.FailReason))
                    throw new ArgumentException($"FailReason is required when result is 'Fail' for ReceiptDetailId {d.ReceiptDetailId}");
            }

            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var allowedStatuses = new[] { "Approved", "GoodsArrived" };
            if (!allowedStatuses.Contains(receipt.Status))
                throw new InvalidOperationException(
                    $"Cannot submit QC check for receipt with status '{receipt.Status}'. Must be 'Approved' or 'GoodsArrived'");

            // Check duplicate QC check
            var existingQC = await _context.QCChecks
                .FirstOrDefaultAsync(q => q.ReceiptId == receiptId);
            if (existingQC != null)
                throw new InvalidOperationException(
                    $"A QC check already exists for receipt {receipt.ReceiptCode} (QCCheckCode: {existingQC.QCCheckCode})");

            // Validate receipt detail IDs belong to this receipt
            var receiptDetailIds = receipt.ReceiptDetails.Select(rd => rd.DetailId).ToHashSet();
            var invalidIds = dto.Details
                .Where(d => !receiptDetailIds.Contains(d.ReceiptDetailId))
                .Select(d => d.ReceiptDetailId)
                .ToList();
            if (invalidIds.Any())
                throw new ArgumentException(
                    $"ReceiptDetailIds {string.Join(", ", invalidIds)} do not belong to receipt {receiptId}");

            // Generate QCCheckCode
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
                OverallResult = dto.OverallResult,
                Notes = dto.Notes,
                QCCheckDetails = dto.Details.Select(d => new QCCheckDetail
                {
                    ReceiptDetailId = d.ReceiptDetailId,
                    Result = d.Result,
                    FailReason = d.FailReason
                }).ToList()
            };

            _context.QCChecks.Add(qcCheck);

            // Transition status: Approved/GoodsArrived → GoodsArrived
            receipt.Status = "GoodsArrived";

            await _context.SaveChangesAsync();

            // Return result with navigation data
            return MapQCCheckToDto(qcCheck, receipt.ReceiptCode, receipt.ReceiptDetails);
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
                        FailReason = d.FailReason
                    };
                }).ToList()
            };
        }

        #endregion

        #region Incident Report Methods

        public async Task<IncidentReportDto> CreateIncidentReportAsync(long receiptId, CreateIncidentReportDto dto, int staffId)
        {
            // Validate description
            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new ArgumentException("Description is required");

            // Validate IssueType values
            var validIssueTypes = new[] { "Quantity", "Quality", "Damage" };
            foreach (var d in dto.Details)
            {
                if (!validIssueTypes.Contains(d.IssueType))
                    throw new ArgumentException(
                        $"IssueType '{d.IssueType}' is invalid for ReceiptDetailId {d.ReceiptDetailId}. Must be: Quantity | Quality | Damage");

                if (d.ActualQuantity < 0 || d.ExpectedQuantity < 0)
                    throw new ArgumentException(
                        $"Quantities must be non-negative for ReceiptDetailId {d.ReceiptDetailId}");
            }

            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");

            var allowedStatuses = new[] { "Approved", "GoodsArrived" };
            if (!allowedStatuses.Contains(receipt.Status))
                throw new InvalidOperationException(
                    $"Cannot create incident report for receipt with status '{receipt.Status}'");

            // Kiểm tra đã có biên bản chưa
            var existing = await _context.IncidentReports
                .FirstOrDefaultAsync(i => i.ReceiptId == receiptId);
            if (existing != null)
                throw new InvalidOperationException(
                    $"An incident report already exists for receipt {receipt.ReceiptCode} (IncidentCode: {existing.IncidentCode})");

            // Validate receipt detail IDs
            var receiptDetailIds = receipt.ReceiptDetails.Select(rd => rd.DetailId).ToHashSet();
            var invalidIds = dto.Details
                .Where(d => !receiptDetailIds.Contains(d.ReceiptDetailId))
                .Select(d => d.ReceiptDetailId)
                .ToList();
            if (invalidIds.Any())
                throw new ArgumentException(
                    $"ReceiptDetailIds {string.Join(", ", invalidIds)} do not belong to receipt {receiptId}");

            // Tự động liên kết QCCheck nếu không truyền QCCheckId
            long? qcCheckId = dto.QCCheckId;
            QCCheck? linkedQCCheck = null;
            if (!qcCheckId.HasValue)
            {
                linkedQCCheck = await _context.QCChecks
                    .FirstOrDefaultAsync(q => q.ReceiptId == receiptId && q.OverallResult == "Fail");
                qcCheckId = linkedQCCheck?.QCCheckId;
            }
            else
            {
                linkedQCCheck = await _context.QCChecks
                    .FirstOrDefaultAsync(q => q.QCCheckId == qcCheckId.Value && q.ReceiptId == receiptId);
                if (linkedQCCheck == null)
                    throw new KeyNotFoundException(
                        $"QCCheck with ID {qcCheckId} not found for receipt {receiptId}");
            }

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
                QCCheckId = qcCheckId,
                CreatedBy = staffId,
                CreatedAt = today,
                Description = dto.Description,
                Status = "Open",
                IncidentReportDetails = dto.Details.Select(d => new IncidentReportDetail
                {
                    ReceiptDetailId = d.ReceiptDetailId,
                    MaterialId = receipt.ReceiptDetails.First(rd => rd.DetailId == d.ReceiptDetailId).MaterialId,
                    ExpectedQuantity = d.ExpectedQuantity,
                    ActualQuantity = d.ActualQuantity,
                    IssueType = d.IssueType,
                    Notes = d.Notes
                }).ToList()
            };

            _context.IncidentReports.Add(incident);
            await _context.SaveChangesAsync();

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

        #endregion
    }
}
