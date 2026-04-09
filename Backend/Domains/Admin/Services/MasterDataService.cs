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

        private sealed class SupplierContractSeed
        {
            public int SupplierId { get; set; }
            public long ContractId { get; set; }
            public string ContractCode { get; set; } = null!;
            public string? ContractNumber { get; set; }
            public DateTime EffectiveFrom { get; set; }
            public DateTime? EffectiveTo { get; set; }
            public string Status { get; set; } = null!;
            public bool IsActive { get; set; }
            public string? SupplierName { get; set; }
            public int PurchaseOrderCount { get; set; }
            public decimal? TotalAmount { get; set; }
        }

        private sealed class ProjectContractSeed
        {
            public int ProjectId { get; set; }
            public long ContractId { get; set; }
            public string ContractCode { get; set; } = null!;
            public string? ContractNumber { get; set; }
            public DateTime EffectiveFrom { get; set; }
            public DateTime? EffectiveTo { get; set; }
            public string Status { get; set; } = null!;
            public bool IsActive { get; set; }
            public string? SupplierName { get; set; }
            public int PurchaseOrderCount { get; set; }
            public decimal? TotalAmount { get; set; }
        }

        private static MasterDataContractDto BuildContractDto(
            long contractId,
            string contractCode,
            string? contractNumber,
            DateTime effectiveFrom,
            DateTime? effectiveTo,
            string status,
            bool isActive,
            string? supplierName,
            int purchaseOrderCount,
            decimal? totalAmount,
            IReadOnlyList<MasterDataContractMaterialDto> materials)
        {
            return new MasterDataContractDto
            {
                ContractId = contractId,
                ContractCode = contractCode,
                ContractNumber = contractNumber,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo,
                Status = status,
                IsActive = isActive,
                SupplierName = supplierName,
                PurchaseOrderCount = purchaseOrderCount,
                MaterialCount = materials.Count,
                TotalAmount = totalAmount,
                Materials = materials.ToList()
            };
        }

        private async Task<Dictionary<int, List<MasterDataContractDto>>> BuildSupplierContractsMapAsync(
            IReadOnlyCollection<int> supplierIds,
            CancellationToken ct)
        {
            if (supplierIds.Count == 0)
            {
                return new Dictionary<int, List<MasterDataContractDto>>();
            }

            var contracts = await _db.SupplierContracts
                .AsNoTracking()
                .Where(contract => supplierIds.Contains(contract.SupplierId))
                .Select(contract => new SupplierContractSeed
                {
                    SupplierId = contract.SupplierId,
                    ContractId = contract.ContractId,
                    ContractCode = contract.ContractCode,
                    ContractNumber = contract.ContractNumber,
                    EffectiveFrom = contract.EffectiveFrom,
                    EffectiveTo = contract.EffectiveTo,
                    Status = contract.Status,
                    IsActive = contract.IsActive,
                    SupplierName = contract.Supplier.Name,
                    PurchaseOrderCount = contract.PurchaseOrders.Count(),
                    TotalAmount = contract.PurchaseOrders.Sum(order => order.TotalAmount ?? 0m)
                })
                .ToListAsync(ct);

            if (contracts.Count == 0)
            {
                return supplierIds.ToDictionary(id => id, _ => new List<MasterDataContractDto>());
            }

            var contractIds = contracts
                .Select(contract => contract.ContractId)
                .Distinct()
                .ToList();

            var materials = await _db.PurchaseOrders
                .AsNoTracking()
                .Where(order => order.SupplierContractId.HasValue && contractIds.Contains(order.SupplierContractId.Value))
                .SelectMany(order => order.Items.Select(item => new
                {
                    ContractId = order.SupplierContractId!.Value,
                    item.MaterialId,
                    MaterialCode = item.Material.Code,
                    MaterialName = item.Material.Name,
                    item.Material.Unit,
                    item.OrderedQuantity,
                    LineTotal = item.LineTotal ?? 0m
                }))
                .GroupBy(item => new
                {
                    item.ContractId,
                    item.MaterialId,
                    item.MaterialCode,
                    item.MaterialName,
                    item.Unit
                })
                .Select(group => new
                {
                    group.Key.ContractId,
                    Material = new MasterDataContractMaterialDto
                    {
                        MaterialId = group.Key.MaterialId,
                        Code = group.Key.MaterialCode,
                        Name = group.Key.MaterialName,
                        Unit = group.Key.Unit,
                        OrderedQuantity = group.Sum(item => item.OrderedQuantity),
                        TotalAmount = group.Sum(item => item.LineTotal)
                    }
                })
                .ToListAsync(ct);

            var materialsByContract = materials
                .GroupBy(item => item.ContractId)
                .ToDictionary(
                    group => group.Key,
                    group => (IReadOnlyList<MasterDataContractMaterialDto>)group
                        .Select(item => item.Material)
                        .OrderBy(item => item.Name)
                        .ToList());

            return contracts
                .GroupBy(contract => contract.SupplierId)
                .ToDictionary(
                    group => group.Key,
                    group => group
                        .OrderByDescending(contract => contract.EffectiveFrom)
                        .ThenByDescending(contract => contract.ContractId)
                        .Select(contract => BuildContractDto(
                            contract.ContractId,
                            contract.ContractCode,
                            contract.ContractNumber,
                            contract.EffectiveFrom,
                            contract.EffectiveTo,
                            contract.Status,
                            contract.IsActive,
                            contract.SupplierName,
                            contract.PurchaseOrderCount,
                            contract.TotalAmount,
                            materialsByContract.GetValueOrDefault(
                                contract.ContractId,
                                Array.Empty<MasterDataContractMaterialDto>())))
                        .ToList());
        }

        private async Task<Dictionary<int, List<MasterDataContractDto>>> BuildProjectContractsMapAsync(
            IReadOnlyCollection<int> projectIds,
            CancellationToken ct)
        {
            if (projectIds.Count == 0)
            {
                return new Dictionary<int, List<MasterDataContractDto>>();
            }

            var contracts = await _db.PurchaseOrders
                .AsNoTracking()
                .Where(order => projectIds.Contains(order.ProjectId) && order.SupplierContractId.HasValue)
                .GroupBy(order => new
                {
                    order.ProjectId,
                    ContractId = order.SupplierContractId!.Value,
                    order.SupplierContract!.ContractCode,
                    order.SupplierContract.ContractNumber,
                    order.SupplierContract.EffectiveFrom,
                    order.SupplierContract.EffectiveTo,
                    order.SupplierContract.Status,
                    order.SupplierContract.IsActive,
                    SupplierName = order.Supplier.Name
                })
                .Select(group => new ProjectContractSeed
                {
                    ProjectId = group.Key.ProjectId,
                    ContractId = group.Key.ContractId,
                    ContractCode = group.Key.ContractCode,
                    ContractNumber = group.Key.ContractNumber,
                    EffectiveFrom = group.Key.EffectiveFrom,
                    EffectiveTo = group.Key.EffectiveTo,
                    Status = group.Key.Status,
                    IsActive = group.Key.IsActive,
                    SupplierName = group.Key.SupplierName,
                    PurchaseOrderCount = group.Count(),
                    TotalAmount = group.Sum(order => order.TotalAmount ?? 0m)
                })
                .ToListAsync(ct);

            if (contracts.Count == 0)
            {
                return projectIds.ToDictionary(id => id, _ => new List<MasterDataContractDto>());
            }

            var materials = await _db.PurchaseOrders
                .AsNoTracking()
                .Where(order => projectIds.Contains(order.ProjectId) && order.SupplierContractId.HasValue)
                .SelectMany(order => order.Items.Select(item => new
                {
                    order.ProjectId,
                    ContractId = order.SupplierContractId!.Value,
                    item.MaterialId,
                    MaterialCode = item.Material.Code,
                    MaterialName = item.Material.Name,
                    item.Material.Unit,
                    item.OrderedQuantity,
                    LineTotal = item.LineTotal ?? 0m
                }))
                .GroupBy(item => new
                {
                    item.ProjectId,
                    item.ContractId,
                    item.MaterialId,
                    item.MaterialCode,
                    item.MaterialName,
                    item.Unit
                })
                .Select(group => new
                {
                    group.Key.ProjectId,
                    group.Key.ContractId,
                    Material = new MasterDataContractMaterialDto
                    {
                        MaterialId = group.Key.MaterialId,
                        Code = group.Key.MaterialCode,
                        Name = group.Key.MaterialName,
                        Unit = group.Key.Unit,
                        OrderedQuantity = group.Sum(item => item.OrderedQuantity),
                        TotalAmount = group.Sum(item => item.LineTotal)
                    }
                })
                .ToListAsync(ct);

            var materialsByProjectContract = materials
                .GroupBy(item => (item.ProjectId, item.ContractId))
                .ToDictionary(
                    group => group.Key,
                    group => (IReadOnlyList<MasterDataContractMaterialDto>)group
                        .Select(item => item.Material)
                        .OrderBy(item => item.Name)
                        .ToList());

            return contracts
                .GroupBy(contract => contract.ProjectId)
                .ToDictionary(
                    group => group.Key,
                    group => group
                        .OrderByDescending(contract => contract.EffectiveFrom)
                        .ThenByDescending(contract => contract.ContractId)
                        .Select(contract => BuildContractDto(
                            contract.ContractId,
                            contract.ContractCode,
                            contract.ContractNumber,
                            contract.EffectiveFrom,
                            contract.EffectiveTo,
                            contract.Status,
                            contract.IsActive,
                            contract.SupplierName,
                            contract.PurchaseOrderCount,
                            contract.TotalAmount,
                            materialsByProjectContract.GetValueOrDefault(
                                (contract.ProjectId, contract.ContractId),
                                Array.Empty<MasterDataContractMaterialDto>())))
                        .ToList());
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

            var contractsBySupplier = await BuildSupplierContractsMapAsync(
                items.Select(item => item.SupplierId).ToList(),
                ct);

            foreach (var item in items)
            {
                item.Contracts = contractsBySupplier.GetValueOrDefault(
                    item.SupplierId,
                    new List<MasterDataContractDto>());
            }

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<SupplierDto?> GetSupplierByIdAsync(int id, CancellationToken ct)
        {
            var supplier = await _db.Suppliers
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

            if (supplier == null)
            {
                return null;
            }

            var contractsBySupplier = await BuildSupplierContractsMapAsync(new[] { supplier.SupplierId }, ct);
            supplier.Contracts = contractsBySupplier.GetValueOrDefault(
                supplier.SupplierId,
                new List<MasterDataContractDto>());

            return supplier;
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
                         BudgetUsed = x.BudgetUsed,
                         OverBudgetAllowance = x.OverBudgetAllowance,
                         Status = x.Status
                     }),
                    query.Page,
                    query.PageSize)
                .ToListAsync(ct);

            var contractsByProject = await BuildProjectContractsMapAsync(
                items.Select(item => item.ProjectId).ToList(),
                ct);

            foreach (var item in items)
            {
                item.Contracts = contractsByProject.GetValueOrDefault(
                    item.ProjectId,
                    new List<MasterDataContractDto>());
            }

            return ToPagedResult(items, query.Page, query.PageSize, totalItems);
        }

        public async Task<ProjectDto?> GetProjectByIdAsync(int id, CancellationToken ct)
        {
            var project = await _db.Projects
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
                    BudgetUsed = x.BudgetUsed,
                    OverBudgetAllowance = x.OverBudgetAllowance,
                    Status = x.Status
                })
                .FirstOrDefaultAsync(ct);

            if (project == null)
            {
                return null;
            }

            var contractsByProject = await BuildProjectContractsMapAsync(new[] { project.ProjectId }, ct);
            project.Contracts = contractsByProject.GetValueOrDefault(
                project.ProjectId,
                new List<MasterDataContractDto>());

            return project;
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
                BudgetUsed = request.BudgetUsed,
                OverBudgetAllowance = request.OverBudgetAllowance,
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
            entity.BudgetUsed = request.BudgetUsed;
            entity.OverBudgetAllowance = request.OverBudgetAllowance;
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
