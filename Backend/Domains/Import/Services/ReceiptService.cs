using Backend.Data;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Construction;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.DTOs.Staff;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System.Text.RegularExpressions;

namespace Backend.Domains.Import.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly MyDbContext _context;
        public ReceiptService(MyDbContext context)
        {
            _context = context;
        }

        #region Accountant Methods

        public async Task CreateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId)
        {
            // Step 1: Get receipt
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new Exception("Receipt not found");

            // Step 2: Validate status
            if (receipt.Status != "Requested")
                throw new Exception($"Cannot create draft. Current status: {receipt.Status}");

            // Step 3: Update receipt
            if (dto.WarehouseId.HasValue && dto.WarehouseId.Value > 0) receipt.WarehouseId = dto.WarehouseId; 
            
            receipt.Status = "Draft";
            receipt.AccountantNotes = dto.Notes;

            // Step 4: Update receipt details (quantity & unit price)
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;

                    if (item.UnitPrice.HasValue && item.UnitPrice.Value > 0) detail.UnitPrice = item.UnitPrice;

                    if (item.SupplierId.HasValue && item.SupplierId.Value > 0) detail.SupplierId = item.SupplierId;
                }
            }

            // Step 6: Save changes
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
        }



        public async Task<List<MaterialSuppliersDto>> GetAvailableSuppliersAsync(long receiptId)
        {
            // Step 1: Lấy danh sách MaterialId trong receipt
            var materialIds = await _context.ReceiptDetails
                .Where(rd => rd.ReceiptId == receiptId)
                .Select(rd => rd.MaterialId)
                .Distinct()
                .ToListAsync();

            // Step 2: Lấy quotations cho các materials này
            var quotations = await _context.SupplierQuotations
                .Include(sq => sq.Supplier)
                .Include(sq => sq.Material)
                .Where(sq => materialIds.Contains(sq.MaterialId))
                .Where(sq => sq.IsActive == true)
                .Where(sq => sq.ValidTo == null || sq.ValidTo >= DateTime.UtcNow)
                .ToListAsync();

            // Step 3: Group by MaterialId
            var result = quotations
                .GroupBy(sq => sq.MaterialId)
                .Select(g => new MaterialSuppliersDto
                {
                    MaterialId = g.Key,
                    MaterialCode = g.First().Material?.Code ?? "",
                    MaterialName = g.First().Material?.Name ?? "",
                    Suppliers = g.Select(sq => new SupplierQuotationDto
                    {
                        SupplierId = sq.SupplierId,
                        SupplierName = sq.Supplier?.Name ?? "",
                        Price = sq.Price,
                        Currency = sq.Currency ?? "VND",
                        ValidFrom = sq.ValidFrom,
                        ValidTo = sq.ValidTo,
                        IsActive = sq.IsActive ?? false
                    })
                    .OrderBy(s => s.Price)
                    .ToList()
                })
                .ToList();

            return result;
        }

        // Get all receipts created by the current user (Suveyors)
        public async Task<List<CreateImportRequestDto>> GetMyRequestsAsync(int userId)
        {
            var receipts = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.Warehouse)
                .Where(r => r.CreatedBy == userId)
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new CreateImportRequestDto
                {
                    Items = r.ReceiptDetails.Select(rd => new ImportItemDto
                    {
                        MaterialCode = rd.Material != null ? rd.Material.Code : "",
                        Quantity = rd.Quantity
                    }).ToList()
                }).ToListAsync();
            return receipts;
        }

        // Get all receipts that are REQUESTED status
        public async Task<List<ReceiptSummaryDto>> GetReceiptsForAccountantReviewAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                .Where(r => r.Status == "Requested" || r.Status == "Submitted"
                || r.Status == "Draft" || r.Status == "Rejected") // draft - submitted
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new ReceiptSummaryDto
                {
                    ReceiptId = r.ReceiptId,
                    ReceiptCode = r.ReceiptCode,
                    WarehouseId = r.WarehouseId,
                    WarehouseName = r.Warehouse != null ? r.Warehouse.Name : null,
                    ReceiptDate = r.ReceiptDate,
                    RejectionReason = r.RejectionReason,
                    Status = r.Status,
                    ItemCount = r.ReceiptDetails.Count,
                    CreatedByName = r.CreatedByNavigation != null
                        ? r.CreatedByNavigation.FullName ?? r.CreatedByNavigation.Email
                        : "Unknown"
                })
                .ToListAsync();

            return receipts;
        }

        public async Task<ReceiptDetailDto?> GetReceiptDetailForAccountantReviewAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                return null;

            return new ReceiptDetailDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                WarehouseId = receipt.WarehouseId,
                WarehouseName = receipt.Warehouse?.Name,
                ReceiptDate = receipt.ReceiptDate,
                Status = receipt.Status,
                TotalAmount = receipt.ReceiptDetails.Sum(rd => rd.Quantity * (rd.UnitPrice ?? 0)),
                Items = receipt.ReceiptDetails.Select(rd => new ReceiptItemDto
                {
                    DetailId = rd.DetailId,
                    MaterialId = rd.MaterialId,
                    MaterialCode = rd.Material?.Code ?? "",
                    MaterialName = rd.Material?.Name ?? "",
                    SupplierId = rd.SupplierId,
                    SupplierName = rd.Supplier?.Name ?? "",
                    Quantity = rd.Quantity,
                    UnitPrice = rd.UnitPrice,
                    LineTotal = rd.Quantity * (rd.UnitPrice ?? 0)
                }).ToList()
            };
        }


        public async Task SubmitForApprovalAsync(long receiptId, int accountantId)
        {
            // Step 1: Lấy receipt
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new Exception("Receipt not found");

            // Step 2: Validate status and items without supplier
            if (receipt.Status != "Draft")
                throw new Exception($"Cannot submit. Current status: {receipt.Status}");

            // Step 3: Validate data
            var hasInvalidItems = receipt.ReceiptDetails
                .Any(rd => rd.UnitPrice == null || rd.UnitPrice <= 0);

            if (hasInvalidItems)
                throw new Exception("All items must have valid unit price");

            // Step 4: Update status
            receipt.Status = "Submitted";
            receipt.SubmittedBy = accountantId;
            receipt.SubmittedAt = DateTime.UtcNow;

            // Step 5: Save changes
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
        }


        public async Task UpdateDraftAsync(long receiptId, CreateDraftDto dto, int accountantId)
        {
            // Step 1: Lấy receipt
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new Exception("Receipt not found");

            // Step 2: Validate status (chỉ cho phép sửa khi còn ở Draft)
            if (receipt.Status != "Draft")
                throw new Exception($"Cannot update. Current status: {receipt.Status}");

            // Step 3: Update receipt
            if (dto.WarehouseId.HasValue && dto.WarehouseId.Value > 0) receipt.WarehouseId = dto.WarehouseId;
            receipt.AccountantNotes = dto.Notes;

            // Step 4: Update receipt details
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;

                    if (item.UnitPrice.HasValue && item.UnitPrice.Value > 0) detail.UnitPrice = item.UnitPrice;

                    if (item.SupplierId.HasValue && item.SupplierId.Value > 0) detail.SupplierId = item.SupplierId;
                }
            }

            // Step 6: Save changes
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
        }

        public async Task RevertToDraftAsync(long receiptId, int accountantId)
        {
            var receipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException("Receipt not found");

            if (receipt.Status != "Rejected")
                throw new InvalidOperationException(
                    $"Only Rejected receipts can be reverted. Current status: {receipt.Status}");

            receipt.Status = "Draft";

            await _context.SaveChangesAsync();
        }

        public async Task<List<ReceiptRejectionHistoryDto>> GetRejectionHistoryAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
                throw new KeyNotFoundException("Receipt not found");

            return await _context.ReceiptRejectionHistories
                .Where(h => h.ReceiptId == receiptId)
                .OrderByDescending(h => h.RejectedAt)
                .Select(h => new ReceiptRejectionHistoryDto
                {
                    Id = h.Id,
                    RejectorName = h.Rejector.FullName,
                    RejectedAt = h.RejectedAt,
                    RejectionReason = h.RejectionReason
                })
                .ToListAsync();
        }

        #endregion

        #region Construction Methods
        public async Task ImportFromExcelAsync(Stream fileStream, int warehouseId, int currentUserId)
        {
            using (var package = new ExcelPackage(fileStream))
            {
                var worksheet = package.Workbook.Worksheets[0]; // Assuming data is in the first worksheet
                var rowCount = worksheet.Dimension.Rows;
                var importItems = new List<ImportItemDto>();
                for (int row = 2; row <= rowCount; row++) // Assuming first row is header
                {
                    var materialCode = worksheet.Cells[row, 1].Text?.Trim(); // Assuming MaterialCode is in column 1
                    var quantityText = worksheet.Cells[row, 2].Text; // Assuming Quantity is in column 2

                    var quantity = ParseCleanNumber(quantityText);
                    if (!string.IsNullOrEmpty(materialCode) && quantity > 0)
                    {
                        importItems.Add(new ImportItemDto
                        {
                            MaterialCode = materialCode,
                            Quantity = quantity
                        });
                    }
                }
                // create a receipt request
                var requestReceiptDto = new CreateImportRequestDto
                {
                    Items = importItems
                };

                await CreateRequest(requestReceiptDto, currentUserId);
            }
        }

        public async Task<long> CreateRequest(CreateImportRequestDto dto, int currentUserId)
        {
            // Step 1: get all materials code that Surveyor wants to import
            var materialCodes = dto.Items.Select(c => c.MaterialCode).Distinct().ToList();

            // Step 2: Dictionary to map MaterialCode to MaterialId
            var materialDictionary = await _context.Materials
                .Where(m => materialCodes.Contains(m.Code))
                .ToDictionaryAsync(m => m.Code, m => m.MaterialId);

            // Step 3: Generate unique ReceiptCode
            var receiptCode = await GenerateReceiptCodeAsync();

            // Step 4: Create new Receipt
            var newRequestReceipt = new Receipt
            {
                ReceiptCode = receiptCode,
                CreatedBy = currentUserId,
                ReceiptDate = DateTime.UtcNow,
                Status = "Requested",
                ReceiptDetails = dto.Items
                .Where(c => materialDictionary.ContainsKey(c.MaterialCode))
                .Select(c => new ReceiptDetail
                {
                    MaterialId = materialDictionary[c.MaterialCode],
                    Quantity = c.Quantity,
                }).ToList()
            };

            // Step 4: Save to database
            _context.Receipts.Add(newRequestReceipt);
            await _context.SaveChangesAsync();
            return newRequestReceipt.ReceiptId;
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

        private int ParseCleanNumber(string input)
        {
            if (string.IsNullOrEmpty(input)) return 0;

            var match = Regex.Match(input, @"\d+");

            if (match.Success)
            {
                if (int.TryParse(match.Value, out int result))
                {
                    return result;
                }
            }

            return 0;
        }

        #endregion 

        #region Manager Approval Methods

        public async Task<List<PendingReceiptDto>> GetReceiptForManagerReviewAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Supplier)
                .Where(r => r.Status == "Submitted" || r.Status == "Approved" || r.Status == "Rejected") // reject, approval
                .OrderByDescending(r => r.SubmittedAt)
                .ToListAsync();

            return receipts.Select(r => new PendingReceiptDto
            {
                ReceiptId = r.ReceiptId,
                ReceiptCode = r.ReceiptCode,
                ReceiptDate = r.ReceiptDate,
                WarehouseName = r.Warehouse?.Name,
                TotalAmount = r.ReceiptDetails.Sum(rd => rd.Quantity * rd.UnitPrice),
                Status = r.Status ?? "Unknown",
                CreatedByName = r.CreatedByNavigation?.FullName,
                CreatedDate = r.SubmittedAt,
                Details = r.ReceiptDetails.Select(rd => new PendingReceiptDetailDto
                {
                    DetailId = rd.DetailId,
                    MaterialCode = rd.Material?.Code,
                    MaterialName = rd.Material?.Name,
                    SupplierId = rd.Supplier.SupplierId,
                    SupplierName = rd.Supplier?.Name,
                    Quantity = rd.Quantity,
                    Unit = rd.Material?.Unit,
                    UnitPrice = rd.UnitPrice,
                    SubTotal = rd.Quantity * rd.UnitPrice
                }).ToList()
            }).ToList();
        }

        public async Task<PendingReceiptDto> GetReceiptDetailForManagerReviewAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Supplier)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
            {
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");
            }

            return new PendingReceiptDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                ReceiptDate = receipt.ReceiptDate,
                WarehouseName = receipt.Warehouse?.Name,
                TotalAmount = receipt.ReceiptDetails.Sum(rd => rd.Quantity * rd.UnitPrice),
                Status = receipt.Status ?? "Unknown",
                CreatedByName = receipt.CreatedByNavigation?.FullName,
                CreatedDate = receipt.ReceiptDate,
                Details = receipt.ReceiptDetails.Select(rd => new PendingReceiptDetailDto
                {
                    DetailId = rd.DetailId,
                    MaterialCode = rd.Material?.Code,
                    MaterialName = rd.Material?.Name,
                    SupplierId = rd.Supplier.SupplierId,
                    SupplierName = rd.Supplier?.Name,
                    Quantity = rd.Quantity,
                    Unit = rd.Material?.Unit,
                    UnitPrice = rd.UnitPrice,
                    SubTotal = rd.Quantity * rd.UnitPrice
                }).ToList()
            };
        }

        public async Task ApproveReceiptAsync(long receiptId, int managerId, ApproveReceiptDto dto)
        {
            var receipt = await _context.Receipts
                .Include(r => r.ReceiptDetails)
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
            {
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");
            }

            // Business Rule: Only "Submitted" receipts can be approved
            if (receipt.Status != "Submitted")
            {
                throw new InvalidOperationException(
                    $"Cannot approve receipt. Current status is '{receipt.Status}'. Only 'Submitted' receipts can be approved."
                );
            }

            // Validate that receipt has details
            if (!receipt.ReceiptDetails.Any())
            {
                throw new InvalidOperationException("Cannot approve receipt without any items");
            }


            if (receipt.ReceiptDetails.Any(rd => rd.UnitPrice <= 0))
            {
                throw new InvalidOperationException("Cannot approve receipt with items having invalid price");
            }

            if (receipt.ReceiptDetails.Any(rd => rd.SupplierId == null || rd.SupplierId == 0))
                throw new InvalidOperationException("All items must have supplier information");

            // Update receipt status
            receipt.Status = "Approved";
            receipt.ApprovedBy = managerId;
            receipt.ApprovedAt = DateTime.UtcNow;

            //if (!string.IsNullOrWhiteSpace(dto.ApprovalNotes))
            //{
            //    receipt.Notes = dto.ApprovalNotes;
            //}

            await _context.SaveChangesAsync();
        }

        public async Task RejectReceiptAsync(long receiptId, int managerId, RejectReceiptDto dto)
        {
            var receipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
            {
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");
            }

            // Business Rule: Only "Submitted" receipts can be rejected
            if (receipt.Status != "Submitted")
            {
                throw new InvalidOperationException(
                    $"Cannot reject receipt. Current status is '{receipt.Status}'. Only 'Submitted' receipts can be rejected."
                );
            }

            // Validate rejection reason
            if (string.IsNullOrWhiteSpace(dto.RejectionReason))
            {
                throw new ArgumentException("Rejection reason is required");
            }

            // Update receipt status
            receipt.Status = "Rejected";
            receipt.RejectedBy = managerId;
            receipt.RejectedAt = DateTime.UtcNow;
            receipt.RejectionReason = dto.RejectionReason;

            // Insert history row to preserve full audit trail across multiple rejections
            var history = new ReceiptRejectionHistory
            {
                ReceiptId = receiptId,
                RejectedBy = managerId,
                RejectedAt = DateTime.UtcNow,
                RejectionReason = dto.RejectionReason
            };
            await _context.ReceiptRejectionHistories.AddAsync(history);

            await _context.SaveChangesAsync();
        }

        #endregion

        #region Warehouse Staff Methods

        public async Task<List<GetInboundRequestListDto>> GetReceiptsForWarehouseAsync()
        {
            var receipts = await _context.Receipts
                           .Include(r => r.Warehouse)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Material)
                                        .Include(r => r.ReceiptDetails)
                                        .ThenInclude(rd => rd.Supplier)
                            .Where(r => r.Status == "Approved" || r.Status == "Completed")
                            .OrderByDescending(r => r.ApprovedAt)
                            .Select(r => new GetInboundRequestListDto
                            {
                                ReceiptId = r.ReceiptId,
                                ReceiptCode = r.ReceiptCode,
                                WarehouseId = r.WarehouseId,
                                WarehouseName = r.Warehouse != null ? r.Warehouse.Name : null,
                                ReceiptApprovalDate = r.ApprovedAt,
                                TotalQuantity = r.ReceiptDetails.Sum(rd => rd.Quantity),
                                ConfirmedBy = r.ConfirmedBy,
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

            var totalQuantity = receipt.Status == "Completed"
                ? receipt.ReceiptDetails.Sum(rd => rd.ActualQuantity ?? rd.Quantity)
                : receipt.ReceiptDetails.Sum(rd => rd.Quantity);

            return new GetInboundRequestListDto
            {
                ReceiptId = receipt.ReceiptId,
                ReceiptCode = receipt.ReceiptCode,
                WarehouseId = receipt.WarehouseId,
                WarehouseName = receipt.Warehouse?.Name,
                ReceiptApprovalDate = receipt.ApprovedAt,
                TotalQuantity = totalQuantity,
                ConfirmedBy = receipt.ConfirmedBy,
                Status = receipt.Status,
                Items = receipt.ReceiptDetails.Select(rd => new GetInboundRequestItemDto
                {
                    DetailId = rd.DetailId,
                    MaterialId = rd.MaterialId,
                    MaterialCode = rd.Material?.Code ?? "",
                    MaterialName = rd.Material?.Name ?? "",
                    Unit = rd.Material?.Unit,
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
                    MfgDate = rd.Batch?.MfgDate
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

                if (receipt.Status != "Approved")
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
                        ConfirmedBy = receipt.ConfirmedBy,
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
                receipt.Status = "Completed";
                receipt.ConfirmedBy = staffId;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
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

            //var newBatchCode = batchCode ?? $"BATCH-{material.Code}-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 6).ToUpper()}";

            var batch = new Batch
            {
                MaterialId = materialId,
                BatchCode = batchCode,
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

    }
}
