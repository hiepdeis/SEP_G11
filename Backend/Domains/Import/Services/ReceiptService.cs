using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Construction;
using Backend.Domains.Import.DTOs.Managers;
using Backend.Domains.Import.Interfaces;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using System.Text.RegularExpressions;

namespace Backend.Domains.Import.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly CapstoneSemester9Context _context;
        public ReceiptService(CapstoneSemester9Context context)
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

            // Step 3: Validate supplier
            var supplierExists = await _context.Suppliers
                .AnyAsync(s => s.SupplierId == dto.SupplierId);

            if (!supplierExists)
                throw new Exception("Supplier not found");

            // Step 4: Update receipt
            receipt.SupplierId = dto.SupplierId;
            receipt.Status = "Draft";
            receipt.Notes = dto.Notes;

            // Step 5: Update receipt details (quantity & unit price)
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;
                    detail.UnitPrice = item.UnitPrice;
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

            // Step 3: Create new Receipt
            var newRequestReceipt = new Receipt
            {
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
                .Where(sq => materialIds.Contains(sq.MaterialId ?? 0))
                .Where(sq => sq.IsActive == true) // Chỉ lấy quotation đang active
                .Where(sq => sq.ValidTo == null || sq.ValidTo >= DateTime.UtcNow) // Còn hiệu lực
                .ToListAsync();

            // Step 3: Group by MaterialId
            var result = quotations
                .GroupBy(sq => sq.MaterialId)
                .Select(g => new MaterialSuppliersDto
                {
                    MaterialId = g.Key ?? 0,
                    MaterialCode = g.First().Material?.Code ?? "",
                    MaterialName = g.First().Material?.Name ?? "",
                    Suppliers = g.Select(sq => new SupplierQuotationDto
                    {
                        SupplierId = sq.SupplierId ?? 0,
                        SupplierName = sq.Supplier?.Name ?? "",
                        Price = sq.Price ?? 0,
                        Currency = sq.Currency ?? "VND",
                        ValidFrom = sq.ValidFrom,
                        ValidTo = sq.ValidTo,
                        IsActive = sq.IsActive ?? false
                    })
                    .OrderBy(s => s.Price) // Sắp xếp theo giá tăng dần
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
        public async Task<List<ReceiptSummaryDto>> GetPendingAccountantAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                .Where(r => r.Status == "Requested")
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

        public async Task<ReceiptDetailDto?> GetReceiptDetailAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.Supplier)
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
                SupplierId = receipt.SupplierId,
                SupplierName = receipt.Supplier?.Name,
                ReceiptDate = receipt.ReceiptDate,
                Status = receipt.Status,
                TotalAmount = receipt.ReceiptDetails.Sum(rd => rd.Quantity * (rd.UnitPrice ?? 0)),
                Items = receipt.ReceiptDetails.Select(rd => new ReceiptItemDto
                {
                    DetailId = rd.DetailId,
                    MaterialId = rd.MaterialId,
                    MaterialCode = rd.Material?.Code ?? "",
                    MaterialName = rd.Material?.Name ?? "",
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

            // Step 2: Validate status
            if (receipt.Status != "Draft")
                throw new Exception($"Cannot submit. Current status: {receipt.Status}");

            // Step 3: Validate data (phải có supplier và tất cả items phải có giá)
            if (receipt.SupplierId == null)
                throw new Exception("Supplier must be selected before submitting");

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

            // Step 3: Validate supplier
            var supplierExists = await _context.Suppliers
                .AnyAsync(s => s.SupplierId == dto.SupplierId);

            if (!supplierExists)
                throw new Exception("Supplier not found");

            // Step 4: Update receipt
            receipt.SupplierId = dto.SupplierId;
            receipt.Notes = dto.Notes;

            // Step 5: Update receipt details
            foreach (var item in dto.Items)
            {
                var detail = receipt.ReceiptDetails
                    .FirstOrDefault(rd => rd.MaterialId == item.MaterialId);

                if (detail != null)
                {
                    detail.Quantity = item.Quantity;
                    detail.UnitPrice = item.UnitPrice;
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

        public async Task<List<PendingReceiptDto>> GetPendingApprovalsAsync()
        {
            var receipts = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.Supplier)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.ReceiptDetails)
                    .ThenInclude(rd => rd.Material)
                .Where(r => r.Status == "Submitted")
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();

            return receipts.Select(r => new PendingReceiptDto
            {
                ReceiptId = r.ReceiptId,
                ReceiptDate = r.ReceiptDate,
                WarehouseName = r.Warehouse?.Name,
                SupplierName = r.Supplier?.Name,
                TotalAmount = r.ReceiptDetails.Sum(rd => rd.Quantity * rd.UnitPrice),
                Status = r.Status ?? "Unknown",
                CreatedByName = r.CreatedByNavigation?.FullName,
                CreatedDate = r.ReceiptDate,
                Details = r.ReceiptDetails.Select(rd => new PendingReceiptDetailDto
                {
                    DetailId = rd.DetailId,
                    MaterialCode = rd.Material?.Code,
                    MaterialName = rd.Material?.Name,
                    Quantity = rd.Quantity,
                    Unit = rd.Material?.Unit,
                    UnitPrice = rd.UnitPrice,
                    SubTotal = rd.Quantity * rd.UnitPrice
                }).ToList()
            }).ToList();
        }

        public async Task<PendingReceiptDto> GetReceiptDetailForApprovalAsync(long receiptId)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Warehouse)
                .Include(r => r.Supplier)
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
                SupplierName = receipt.Supplier?.Name,
                TotalAmount = receipt.ReceiptDetails.Sum(rd => rd.Quantity * rd.UnitPrice),
                Status = receipt.Status ?? "Unknown",
                CreatedByName = receipt.CreatedByNavigation?.FullName,
                CreatedDate = receipt.ReceiptDate,
                Details = receipt.ReceiptDetails.Select(rd => new PendingReceiptDetailDto
                {
                    DetailId = rd.DetailId,
                    MaterialCode = rd.Material?.Code,
                    MaterialName = rd.Material?.Name,
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

            // Validate that all items have supplier and price
            if (receipt.SupplierId == null)
            {
                throw new InvalidOperationException("Cannot approve receipt without supplier information");
            }

            if (receipt.ReceiptDetails.Any(rd => rd.UnitPrice <= 0))
            {
                throw new InvalidOperationException("Cannot approve receipt with items having invalid price");
            }

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
