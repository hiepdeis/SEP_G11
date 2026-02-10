using Backend.Data;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Construction;
using Backend.Domains.Import.DTOs.Managers;
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
            receipt.Status = "Draft";
            receipt.Notes = dto.Notes;

            // Step 4: Update receipt details (quantity & unit price)
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;
                    detail.UnitPrice = item.UnitPrice;
                    detail.SupplierId = item.SupplierId;
                }
            }

            // Step 6: Save changes
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
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
                WarehouseId = dto.WarehouseId,
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
                .Where(r => r.CreatedBy == userId)
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new CreateImportRequestDto
                {
                    WarehouseId = r.WarehouseId,
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
                .Where(r => r.Status == "Requested" || r.Status == "Submitted" || r.Status == "Draft") // draft - submitted
                .OrderByDescending(r => r.ReceiptDate)
                .Select(r => new ReceiptSummaryDto
                {
                    ReceiptId = r.ReceiptId,
                    ReceiptCode = r.ReceiptCode,
                    WarehouseId = r.WarehouseId,
                    WarehouseName = r.Warehouse != null ? r.Warehouse.Name : null,
                    ReceiptDate = r.ReceiptDate,
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
                    Quantity = rd.Quantity,
                    UnitPrice = rd.UnitPrice,
                    LineTotal = rd.Quantity * (rd.UnitPrice ?? 0)
                }).ToList()
            };
        }

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
                    WarehouseId = warehouseId,
                    Items = importItems
                };

                await CreateRequest(requestReceiptDto, currentUserId);
            }
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

            var itemsWithoutSupplier = receipt.ReceiptDetails
                .Where(rd => rd.SupplierId == null || rd.SupplierId == 0)
                .ToList();

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
            receipt.Notes = dto.Notes;

            // Step 4: Update receipt details
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;
                    detail.UnitPrice = item.UnitPrice;
                    detail.SupplierId = item.SupplierId;
                }
            }

            // Step 6: Save changes
            _context.Receipts.Update(receipt);
            await _context.SaveChangesAsync();
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


        #region Manager Approval Methods

        public async Task<List<PendingReceiptDto>> GetReceiptForManagerReviewAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Where(r => r.Status == "Submitted" || r.Status == "Approved" || r.Status == "Rejected") // reject, approval
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();

            return receipts.Select(r => new PendingReceiptDto
            {
                ReceiptId = r.ReceiptId,
                ReceiptDate = r.ReceiptDate,
                WarehouseName = r.Warehouse?.Name,
                TotalAmount = r.ReceiptDetails.Sum(rd => rd.Quantity * rd.UnitPrice),
                Status = r.Status ?? "Unknown",
                CreatedByName = r.CreatedByNavigation?.FullName,
                CreatedDate = r.ReceiptDate,
                Details = r.ReceiptDetails.Select(rd => new PendingReceiptDetailDto
                {
                    DetailId = rd.DetailId,
                    MaterialCode = rd.Material?.Code,
                    MaterialName = rd.Material?.Name,
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
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);

            if (receipt == null)
            {
                throw new KeyNotFoundException($"Receipt with ID {receiptId} not found");
            }

            return new PendingReceiptDto
            {
                ReceiptId = receipt.ReceiptId,
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

            if (!string.IsNullOrWhiteSpace(dto.ApprovalNotes))
            {
                receipt.Notes = dto.ApprovalNotes;
            }

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
            receipt.ApprovedBy = managerId;
            receipt.ApprovedAt = DateTime.UtcNow;
            receipt.Notes = dto.RejectionReason;

            await _context.SaveChangesAsync();
        }

        #endregion

    }
}
