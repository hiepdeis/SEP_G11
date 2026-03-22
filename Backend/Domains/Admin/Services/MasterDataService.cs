using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;

using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class MasterDataService : IMasterDataService
    {
        private readonly MyDbContext _db;

        public MasterDataService(MyDbContext db)
        {
            _db = db;
        }

        // =========================================================
        // Helpers
        // =========================================================

        private static string Normalize(string? value)
            => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

        private static MasterDataPagedResult<T> ToPagedResult<T>(
            List<T> items,
            int page,
            int pageSize,
            int totalItems)
        {
            return new MasterDataPagedResult<T>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };
        }

        private static IQueryable<T> ApplyPaging<T>(IQueryable<T> query, int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            return query.Skip((page - 1) * pageSize).Take(pageSize);
        }

        private static bool IsValidProjectStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;

            return status.Equals("Planned", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Active", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Completed", StringComparison.OrdinalIgnoreCase)
                || status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeProjectStatus(string status)
        {
            if (status.Equals("Planned", StringComparison.OrdinalIgnoreCase)) return "Planned";
            if (status.Equals("Active", StringComparison.OrdinalIgnoreCase)) return "Active";
            if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase)) return "Completed";
            if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)) return "Cancelled";
            return status.Trim();
        }

        // =========================================================
        // ROLES
        // =========================================================

        public async Task<MasterDataPagedResult<RoleAdminDto>> GetRolesAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.Roles.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x => x.RoleName.ToLower().Contains(keyword));
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.RoleId)
                     .Select(x => new RoleAdminDto
                     {
                         RoleId = x.RoleId,
                         RoleName = x.RoleName
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<RoleAdminDto?> GetRoleByIdAsync(int id, CancellationToken ct)
        {
            return await _db.Roles
                .AsNoTracking()
                .Where(x => x.RoleId == id)
                .Select(x => new RoleAdminDto
                {
                    RoleId = x.RoleId,
                    RoleName = x.RoleName
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateRoleAsync(UpsertRoleDto request, CancellationToken ct)
        {
            var roleName = Normalize(request.RoleName);
            if (string.IsNullOrWhiteSpace(roleName))
                throw new ArgumentException("RoleName is required.");

            var exists = await _db.Roles.AnyAsync(
                x => x.RoleName.ToLower() == roleName.ToLower(), ct);

            if (exists)
                throw new ArgumentException("Role name already exists.");

            var entity = new Role
            {
                RoleName = roleName
            };

            _db.Roles.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.RoleId;
        }

        public async Task<bool> UpdateRoleAsync(int id, UpsertRoleDto request, CancellationToken ct)
        {
            var entity = await _db.Roles.FirstOrDefaultAsync(x => x.RoleId == id, ct);
            if (entity == null) return false;

            var roleName = Normalize(request.RoleName);
            if (string.IsNullOrWhiteSpace(roleName))
                throw new ArgumentException("RoleName is required.");

            var exists = await _db.Roles.AnyAsync(
                x => x.RoleId != id && x.RoleName.ToLower() == roleName.ToLower(), ct);

            if (exists)
                throw new ArgumentException("Role name already exists.");

            entity.RoleName = roleName;
            await _db.SaveChangesAsync(ct);

            return true;
        }

        public async Task<bool> DeleteRoleAsync(int id, CancellationToken ct)
        {
            var entity = await _db.Roles.FirstOrDefaultAsync(x => x.RoleId == id, ct);
            if (entity == null) return false;

            var isUsed = await _db.Users.AnyAsync(x => x.RoleId == id, ct);
            if (isUsed)
                throw new InvalidOperationException("Cannot delete role because it is being used by users.");

            _db.Roles.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // =========================================================
        // MATERIAL CATEGORIES
        // =========================================================

        public async Task<MasterDataPagedResult<MaterialCategoryDto>> GetCategoriesAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.MaterialCategories.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.Code.ToLower().Contains(keyword) ||
                    x.Name.ToLower().Contains(keyword) ||
                    (x.Description != null && x.Description.ToLower().Contains(keyword)));
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.CategoryId)
                     .Select(x => new MaterialCategoryDto
                     {
                         CategoryId = x.CategoryId,
                         Code = x.Code,
                         Name = x.Name,
                         Description = x.Description
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<MaterialCategoryDto?> GetCategoryByIdAsync(int id, CancellationToken ct)
        {
            return await _db.MaterialCategories
                .AsNoTracking()
                .Where(x => x.CategoryId == id)
                .Select(x => new MaterialCategoryDto
                {
                    CategoryId = x.CategoryId,
                    Code = x.Code,
                    Name = x.Name,
                    Description = x.Description
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateCategoryAsync(UpsertMaterialCategoryDto request, CancellationToken ct)
        {
            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var description = Normalize(request.Description);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.MaterialCategories.AnyAsync(
                x => x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Category code already exists.");

            var entity = new MaterialCategory
            {
                Code = code,
                Name = name,
                Description = string.IsNullOrWhiteSpace(description) ? null : description
            };

            _db.MaterialCategories.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.CategoryId;
        }

        public async Task<bool> UpdateCategoryAsync(int id, UpsertMaterialCategoryDto request, CancellationToken ct)
        {
            var entity = await _db.MaterialCategories.FirstOrDefaultAsync(x => x.CategoryId == id, ct);
            if (entity == null) return false;

            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var description = Normalize(request.Description);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.MaterialCategories.AnyAsync(
                x => x.CategoryId != id && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Category code already exists.");

            entity.Code = code;
            entity.Name = name;
            entity.Description = string.IsNullOrWhiteSpace(description) ? null : description;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteCategoryAsync(int id, CancellationToken ct)
        {
            var entity = await _db.MaterialCategories.FirstOrDefaultAsync(x => x.CategoryId == id, ct);
            if (entity == null) return false;

            var isUsed = await _db.Materials.AnyAsync(x => x.CategoryId == id, ct);
            if (isUsed)
                throw new InvalidOperationException("Cannot delete category because it is being used by materials.");

            _db.MaterialCategories.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // =========================================================
        // ADJUSTMENT REASONS
        // =========================================================

        public async Task<MasterDataPagedResult<AdjustmentReasonDto>> GetAdjustmentReasonsAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.AdjustmentReasons.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.Code.ToLower().Contains(keyword) ||
                    x.Name.ToLower().Contains(keyword) ||
                    (x.Description != null && x.Description.ToLower().Contains(keyword)));
            }

            if (query.IsActive.HasValue)
            {
                q = q.Where(x => x.IsActive == query.IsActive.Value);
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.ReasonId)
                     .Select(x => new AdjustmentReasonDto
                     {
                         ReasonId = x.ReasonId,
                         Code = x.Code,
                         Name = x.Name,
                         Description = x.Description,
                         IsActive = x.IsActive
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<AdjustmentReasonDto?> GetAdjustmentReasonByIdAsync(int id, CancellationToken ct)
        {
            return await _db.AdjustmentReasons
                .AsNoTracking()
                .Where(x => x.ReasonId == id)
                .Select(x => new AdjustmentReasonDto
                {
                    ReasonId = x.ReasonId,
                    Code = x.Code,
                    Name = x.Name,
                    Description = x.Description,
                    IsActive = x.IsActive
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateAdjustmentReasonAsync(UpsertAdjustmentReasonDto request, CancellationToken ct)
        {
            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var description = Normalize(request.Description);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.AdjustmentReasons.AnyAsync(
                x => x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Adjustment reason code already exists.");

            var entity = new AdjustmentReason
            {
                Code = code,
                Name = name,
                Description = string.IsNullOrWhiteSpace(description) ? null : description,
                IsActive = request.IsActive
            };

            _db.AdjustmentReasons.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.ReasonId;
        }

        public async Task<bool> UpdateAdjustmentReasonAsync(int id, UpsertAdjustmentReasonDto request, CancellationToken ct)
        {
            var entity = await _db.AdjustmentReasons.FirstOrDefaultAsync(x => x.ReasonId == id, ct);
            if (entity == null) return false;

            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var description = Normalize(request.Description);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.AdjustmentReasons.AnyAsync(
                x => x.ReasonId != id && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Adjustment reason code already exists.");

            entity.Code = code;
            entity.Name = name;
            entity.Description = string.IsNullOrWhiteSpace(description) ? null : description;
            entity.IsActive = request.IsActive;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> UpdateAdjustmentReasonStatusAsync(int id, MasterDataStatusDto request, CancellationToken ct)
        {
            var entity = await _db.AdjustmentReasons.FirstOrDefaultAsync(x => x.ReasonId == id, ct);
            if (entity == null) return false;

            entity.IsActive = request.IsActive;
            await _db.SaveChangesAsync(ct);

            return true;
        }

        public async Task<bool> DeleteAdjustmentReasonAsync(int id, CancellationToken ct)
        {
            var entity = await _db.AdjustmentReasons.FirstOrDefaultAsync(x => x.ReasonId == id, ct);
            if (entity == null) return false;

            // Nếu bảng tham chiếu có tồn tại thì mở check này.
            // Sửa lại tên DbSet/field cho đúng project của ông.
            //
            // var isUsed = await _db.StockTakeDetails.AnyAsync(x => x.AdjustmentReasonId == id, ct);
            // if (isUsed)
            //     throw new InvalidOperationException("Cannot delete adjustment reason because it is already in use.");

            _db.AdjustmentReasons.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // =========================================================
        // SUPPLIERS
        // =========================================================

        public async Task<MasterDataPagedResult<SupplierDto>> GetSuppliersAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.Suppliers.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.Code.ToLower().Contains(keyword) ||
                    x.Name.ToLower().Contains(keyword) ||
                    (x.TaxCode != null && x.TaxCode.ToLower().Contains(keyword)) ||
                    (x.Address != null && x.Address.ToLower().Contains(keyword)));
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.SupplierId)
                     .Select(x => new SupplierDto
                     {
                         SupplierId = x.SupplierId,
                         Code = x.Code,
                         Name = x.Name,
                         TaxCode = x.TaxCode,
                         Address = x.Address
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<SupplierDto?> GetSupplierByIdAsync(int id, CancellationToken ct)
        {
            return await _db.Suppliers
                .AsNoTracking()
                .Where(x => x.SupplierId == id)
                .Select(x => new SupplierDto
                {
                    SupplierId = x.SupplierId,
                    Code = x.Code,
                    Name = x.Name,
                    TaxCode = x.TaxCode,
                    Address = x.Address
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateSupplierAsync(UpsertSupplierDto request, CancellationToken ct)
        {
            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var taxCode = Normalize(request.TaxCode);
            var address = Normalize(request.Address);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.Suppliers.AnyAsync(
                x => x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Supplier code already exists.");

            var entity = new Supplier
            {
                Code = code,
                Name = name,
                TaxCode = string.IsNullOrWhiteSpace(taxCode) ? null : taxCode,
                Address = string.IsNullOrWhiteSpace(address) ? null : address
            };

            _db.Suppliers.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.SupplierId;
        }

        public async Task<bool> UpdateSupplierAsync(int id, UpsertSupplierDto request, CancellationToken ct)
        {
            var entity = await _db.Suppliers.FirstOrDefaultAsync(x => x.SupplierId == id, ct);
            if (entity == null) return false;

            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var taxCode = Normalize(request.TaxCode);
            var address = Normalize(request.Address);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var codeExists = await _db.Suppliers.AnyAsync(
                x => x.SupplierId != id && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Supplier code already exists.");

            entity.Code = code;
            entity.Name = name;
            entity.TaxCode = string.IsNullOrWhiteSpace(taxCode) ? null : taxCode;
            entity.Address = string.IsNullOrWhiteSpace(address) ? null : address;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteSupplierAsync(int id, CancellationToken ct)
        {
            var entity = await _db.Suppliers.FirstOrDefaultAsync(x => x.SupplierId == id, ct);
            if (entity == null) return false;

            // Nếu project có bảng tham chiếu thì sửa lại cho đúng tên thật:
            //
            // var usedInReceipts = await _db.ReceiptDetails.AnyAsync(x => x.SupplierId == id, ct);
            // var usedInQuotations = await _db.SupplierQuotations.AnyAsync(x => x.SupplierId == id, ct);
            //
            // if (usedInReceipts || usedInQuotations)
            //     throw new InvalidOperationException("Cannot delete supplier because it is already in use.");

            _db.Suppliers.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // =========================================================
        // WAREHOUSES
        // =========================================================

        public async Task<MasterDataPagedResult<WarehouseDto>> GetWarehousesAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.Warehouses.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.Name.ToLower().Contains(keyword) ||
                    (x.Address != null && x.Address.ToLower().Contains(keyword)));
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.WarehouseId)
                     .Select(x => new WarehouseDto
                     {
                         WarehouseId = x.WarehouseId,
                         Name = x.Name,
                         Address = x.Address,
                         BinCount = _db.BinLocations.Count(b => b.WarehouseId == x.WarehouseId)
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<WarehouseDto?> GetWarehouseByIdAsync(int id, CancellationToken ct)
        {
            return await _db.Warehouses
                .AsNoTracking()
                .Where(x => x.WarehouseId == id)
                .Select(x => new WarehouseDto
                {
                    WarehouseId = x.WarehouseId,
                    Name = x.Name,
                    Address = x.Address,
                    BinCount = _db.BinLocations.Count(b => b.WarehouseId == x.WarehouseId)
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateWarehouseAsync(UpsertWarehouseDto request, CancellationToken ct)
        {
            var name = Normalize(request.Name);
            var address = Normalize(request.Address);

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var exists = await _db.Warehouses.AnyAsync(
                x => x.Name.ToLower() == name.ToLower(), ct);

            if (exists)
                throw new ArgumentException("Warehouse name already exists.");

            var entity = new Warehouse
            {
                Name = name,
                Address = string.IsNullOrWhiteSpace(address) ? null : address
            };

            _db.Warehouses.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.WarehouseId;
        }

        public async Task<bool> UpdateWarehouseAsync(int id, UpsertWarehouseDto request, CancellationToken ct)
        {
            var entity = await _db.Warehouses.FirstOrDefaultAsync(x => x.WarehouseId == id, ct);
            if (entity == null) return false;

            var name = Normalize(request.Name);
            var address = Normalize(request.Address);

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            var exists = await _db.Warehouses.AnyAsync(
                x => x.WarehouseId != id && x.Name.ToLower() == name.ToLower(), ct);

            if (exists)
                throw new ArgumentException("Warehouse name already exists.");

            entity.Name = name;
            entity.Address = string.IsNullOrWhiteSpace(address) ? null : address;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteWarehouseAsync(int id, CancellationToken ct)
        {
            var entity = await _db.Warehouses.FirstOrDefaultAsync(x => x.WarehouseId == id, ct);
            if (entity == null) return false;

            var hasBins = await _db.BinLocations.AnyAsync(x => x.WarehouseId == id, ct);
            if (hasBins)
                throw new InvalidOperationException("Cannot delete warehouse because it still has bin locations.");

            // Nếu project có thêm bảng tham chiếu warehouse, mở rộng check ở đây.
            //
            // var hasReceipts = await _db.ReceiptSlips.AnyAsync(x => x.WarehouseId == id, ct);
            // var hasIssues = await _db.IssueSlips.AnyAsync(x => x.WarehouseId == id, ct);
            // var hasStockTakes = await _db.StockTakes.AnyAsync(x => x.WarehouseId == id, ct);
            // if (hasReceipts || hasIssues || hasStockTakes)
            //     throw new InvalidOperationException("Cannot delete warehouse because it is already in use.");

            _db.Warehouses.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        public async Task<List<MasterDataLookupDto>> GetWarehouseLookupAsync(CancellationToken ct)
        {
            return await _db.Warehouses
                .AsNoTracking()
                .OrderBy(x => x.Name)
                .Select(x => new MasterDataLookupDto
                {
                    Id = x.WarehouseId,
                    Name = x.Name
                })
                .ToListAsync(ct);
        }

        // =========================================================
        // BIN LOCATIONS
        // =========================================================

        public async Task<MasterDataPagedResult<BinLocationDto>> GetBinLocationsAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q =
                from b in _db.BinLocations.AsNoTracking()
                join w in _db.Warehouses.AsNoTracking() on b.WarehouseId equals w.WarehouseId
                select new { b, w };

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.b.Code.ToLower().Contains(keyword) ||
                    (x.b.Type != null && x.b.Type.ToLower().Contains(keyword)) ||
                    x.w.Name.ToLower().Contains(keyword));
            }

            if (query.WarehouseId.HasValue)
            {
                q = q.Where(x => x.b.WarehouseId == query.WarehouseId.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.Type))
            {
                var type = query.Type.Trim().ToLower();
                q = q.Where(x => x.b.Type != null && x.b.Type.ToLower() == type);
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderBy(x => x.b.BinId)
                     .Select(x => new BinLocationDto
                     {
                         BinId = x.b.BinId,
                         WarehouseId = x.b.WarehouseId,
                         WarehouseName = x.w.Name,
                         Code = x.b.Code,
                         Type = x.b.Type
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<BinLocationDto?> GetBinLocationByIdAsync(int id, CancellationToken ct)
        {
            var query =
                from b in _db.BinLocations.AsNoTracking()
                join w in _db.Warehouses.AsNoTracking() on b.WarehouseId equals w.WarehouseId
                where b.BinId == id
                select new BinLocationDto
                {
                    BinId = b.BinId,
                    WarehouseId = b.WarehouseId,
                    WarehouseName = w.Name,
                    Code = b.Code,
                    Type = b.Type
                };

            return await query.FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateBinLocationAsync(UpsertBinLocationDto request, CancellationToken ct)
        {
            var warehouseExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId, ct);
            if (!warehouseExists)
                throw new ArgumentException("WarehouseId does not exist.");

            var code = Normalize(request.Code).ToUpper();
            var type = Normalize(request.Type);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            var codeExists = await _db.BinLocations.AnyAsync(
                x => x.WarehouseId == request.WarehouseId && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Bin code already exists in this warehouse.");

            var entity = new BinLocation
            {
                WarehouseId = request.WarehouseId,
                Code = code,
                Type = string.IsNullOrWhiteSpace(type) ? null : type
            };

            _db.BinLocations.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.BinId;
        }

        public async Task<bool> UpdateBinLocationAsync(int id, UpsertBinLocationDto request, CancellationToken ct)
        {
            var entity = await _db.BinLocations.FirstOrDefaultAsync(x => x.BinId == id, ct);
            if (entity == null) return false;

            var warehouseExists = await _db.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId, ct);
            if (!warehouseExists)
                throw new ArgumentException("WarehouseId does not exist.");

            var code = Normalize(request.Code).ToUpper();
            var type = Normalize(request.Type);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            var codeExists = await _db.BinLocations.AnyAsync(
                x => x.BinId != id
                  && x.WarehouseId == request.WarehouseId
                  && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Bin code already exists in this warehouse.");

            entity.WarehouseId = request.WarehouseId;
            entity.Code = code;
            entity.Type = string.IsNullOrWhiteSpace(type) ? null : type;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteBinLocationAsync(int id, CancellationToken ct)
        {
            var entity = await _db.BinLocations.FirstOrDefaultAsync(x => x.BinId == id, ct);
            if (entity == null) return false;

            // Nếu project có inventory/current stock theo bin thì mở check này:
            var hasInventory = await _db.InventoryCurrents.AnyAsync(x => x.BinId == id, ct);
            if (hasInventory)
                throw new InvalidOperationException("Cannot delete bin location because it is being used by inventory.");

            _db.BinLocations.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // =========================================================
        // PROJECTS
        // =========================================================

        public async Task<MasterDataPagedResult<ProjectDto>> GetProjectsAsync(MasterDataQueryDto query, CancellationToken ct)
        {
            query.Page = query.Page <= 0 ? 1 : query.Page;
            query.PageSize = query.PageSize <= 0 ? 10 : query.PageSize;

            var q = _db.Projects.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();
                q = q.Where(x =>
                    x.Code.ToLower().Contains(keyword) ||
                    x.Name.ToLower().Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                var status = query.Status.Trim().ToLower();
                q = q.Where(x => x.Status != null && x.Status.ToLower() == status);
            }

            var totalItems = await q.CountAsync(ct);

            var items = await ApplyPaging(
                    q.OrderByDescending(x => x.ProjectId)
                     .Select(x => new ProjectDto
                     {
                         ProjectId = x.ProjectId,
                         Code = x.Code,
                         Name = x.Name,
                         StartDate = x.StartDate,
                         EndDate = x.EndDate,
                         Budget = x.Budget,
                         Status = x.Status
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<ProjectDto?> GetProjectByIdAsync(int id, CancellationToken ct)
        {
            return await _db.Projects
                .AsNoTracking()
                .Where(x => x.ProjectId == id)
                .Select(x => new ProjectDto
                {
                    ProjectId = x.ProjectId,
                    Code = x.Code,
                    Name = x.Name,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    Budget = x.Budget,
                    Status = x.Status
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int> CreateProjectAsync(UpsertProjectDto request, CancellationToken ct)
        {
            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : NormalizeProjectStatus(request.Status);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            if (!IsValidProjectStatus(status))
                throw new ArgumentException("Invalid project status.");

            if (request.StartDate.HasValue && request.EndDate.HasValue && request.EndDate.Value.Date < request.StartDate.Value.Date)
                throw new ArgumentException("EndDate must be greater than or equal to StartDate.");

            var codeExists = await _db.Projects.AnyAsync(
                x => x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Project code already exists.");

            var entity = new Project
            {
                Code = code,
                Name = name,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Budget = request.Budget,
                Status = status
            };

            _db.Projects.Add(entity);
            await _db.SaveChangesAsync(ct);

            return entity.ProjectId;
        }

        public async Task<bool> UpdateProjectAsync(int id, UpsertProjectDto request, CancellationToken ct)
        {
            var entity = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (entity == null) return false;

            var code = Normalize(request.Code).ToUpper();
            var name = Normalize(request.Name);
            var status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : NormalizeProjectStatus(request.Status);

            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Code is required.");

            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name is required.");

            if (!IsValidProjectStatus(status))
                throw new ArgumentException("Invalid project status.");

            if (request.StartDate.HasValue && request.EndDate.HasValue && request.EndDate.Value.Date < request.StartDate.Value.Date)
                throw new ArgumentException("EndDate must be greater than or equal to StartDate.");

            var codeExists = await _db.Projects.AnyAsync(
                x => x.ProjectId != id && x.Code.ToLower() == code.ToLower(), ct);

            if (codeExists)
                throw new ArgumentException("Project code already exists.");

            entity.Code = code;
            entity.Name = name;
            entity.StartDate = request.StartDate;
            entity.EndDate = request.EndDate;
            entity.Budget = request.Budget;
            entity.Status = status;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> UpdateProjectStatusAsync(int id, ProjectStatusUpdateDto request, CancellationToken ct)
        {
            var entity = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (entity == null) return false;

            var status = Normalize(request.Status);
            if (!IsValidProjectStatus(status))
                throw new ArgumentException("Invalid project status.");

            entity.Status = NormalizeProjectStatus(status);
            await _db.SaveChangesAsync(ct);

            return true;
        }

        public async Task<bool> DeleteProjectAsync(int id, CancellationToken ct)
        {
            var entity = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (entity == null) return false;

            // Nếu project có bảng dùng ProjectId thì mở rộng check tại đây.
            // Ví dụ:
            //
            // var isUsed = await _db.IssueSlips.AnyAsync(x => x.ProjectId == id, ct);
            // if (isUsed)
            //     throw new InvalidOperationException("Cannot delete project because it is already in use.");

            _db.Projects.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return true;
        }
    }
}