using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/master-data")]
    public sealed class MasterDataController : ControllerBase
    {
        private readonly IMasterDataService _service;

        public MasterDataController(IMasterDataService service)
        {
            _service = service;
        }

        // =========================================================
        // ROLES
        // =========================================================

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetRolesAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("roles/{id:int}")]
        public async Task<IActionResult> GetRoleById(int id, CancellationToken ct)
        {
            var result = await _service.GetRoleByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Role not found." });

            return Ok(result);
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] UpsertRoleDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateRoleAsync(request, ct);
                return Ok(new { message = "Role created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("roles/{id:int}")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpsertRoleDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateRoleAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Role not found." });

                return Ok(new { message = "Role updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("roles/{id:int}")]
        public async Task<IActionResult> DeleteRole(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteRoleAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Role not found." });

                return Ok(new { message = "Role deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // MATERIAL CATEGORIES
        // =========================================================

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetCategoriesAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("categories/{id:int}")]
        public async Task<IActionResult> GetCategoryById(int id, CancellationToken ct)
        {
            var result = await _service.GetCategoryByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Category not found." });

            return Ok(result);
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] UpsertMaterialCategoryDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateCategoryAsync(request, ct);
                return Ok(new { message = "Category created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("categories/{id:int}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpsertMaterialCategoryDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateCategoryAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Category not found." });

                return Ok(new { message = "Category updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("categories/{id:int}")]
        public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteCategoryAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Category not found." });

                return Ok(new { message = "Category deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // ADJUSTMENT REASONS
        // =========================================================

        [HttpGet("adjustment-reasons")]
        public async Task<IActionResult> GetAdjustmentReasons([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetAdjustmentReasonsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("adjustment-reasons/{id:int}")]
        public async Task<IActionResult> GetAdjustmentReasonById(int id, CancellationToken ct)
        {
            var result = await _service.GetAdjustmentReasonByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Adjustment reason not found." });

            return Ok(result);
        }

        [HttpPost("adjustment-reasons")]
        public async Task<IActionResult> CreateAdjustmentReason([FromBody] UpsertAdjustmentReasonDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateAdjustmentReasonAsync(request, ct);
                return Ok(new { message = "Adjustment reason created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("adjustment-reasons/{id:int}")]
        public async Task<IActionResult> UpdateAdjustmentReason(int id, [FromBody] UpsertAdjustmentReasonDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateAdjustmentReasonAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Adjustment reason not found." });

                return Ok(new { message = "Adjustment reason updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("adjustment-reasons/{id:int}/status")]
        public async Task<IActionResult> UpdateAdjustmentReasonStatus(int id, [FromBody] MasterDataStatusDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateAdjustmentReasonStatusAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Adjustment reason not found." });

                return Ok(new { message = "Adjustment reason status updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("adjustment-reasons/{id:int}")]
        public async Task<IActionResult> DeleteAdjustmentReason(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteAdjustmentReasonAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Adjustment reason not found." });

                return Ok(new { message = "Adjustment reason deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // SUPPLIERS
        // =========================================================

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetSuppliersAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("suppliers/{id:int}")]
        public async Task<IActionResult> GetSupplierById(int id, CancellationToken ct)
        {
            var result = await _service.GetSupplierByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Supplier not found." });

            return Ok(result);
        }

        [HttpPost("suppliers")]
        public async Task<IActionResult> CreateSupplier([FromBody] UpsertSupplierDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateSupplierAsync(request, ct);
                return Ok(new { message = "Supplier created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("suppliers/{id:int}")]
        public async Task<IActionResult> UpdateSupplier(int id, [FromBody] UpsertSupplierDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateSupplierAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Supplier not found." });

                return Ok(new { message = "Supplier updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("suppliers/{id:int}")]
        public async Task<IActionResult> DeleteSupplier(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteSupplierAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Supplier not found." });

                return Ok(new { message = "Supplier deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // WAREHOUSES
        // =========================================================

        [HttpGet("warehouses")]
        public async Task<IActionResult> GetWarehouses([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetWarehousesAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("warehouses/{id:int}")]
        public async Task<IActionResult> GetWarehouseById(int id, CancellationToken ct)
        {
            var result = await _service.GetWarehouseByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Warehouse not found." });

            return Ok(result);
        }

        [HttpGet("warehouses/lookup")]
        public async Task<IActionResult> GetWarehouseLookup(CancellationToken ct)
        {
            var result = await _service.GetWarehouseLookupAsync(ct);
            return Ok(result);
        }

        [HttpPost("warehouses")]
        public async Task<IActionResult> CreateWarehouse([FromBody] UpsertWarehouseDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateWarehouseAsync(request, ct);
                return Ok(new { message = "Warehouse created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("warehouses/{id:int}")]
        public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] UpsertWarehouseDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateWarehouseAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Warehouse not found." });

                return Ok(new { message = "Warehouse updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("warehouses/{id:int}")]
        public async Task<IActionResult> DeleteWarehouse(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteWarehouseAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Warehouse not found." });

                return Ok(new { message = "Warehouse deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // BIN LOCATIONS
        // =========================================================

        [HttpGet("bin-locations")]
        public async Task<IActionResult> GetBinLocations([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetBinLocationsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("bin-locations/{id:int}")]
        public async Task<IActionResult> GetBinLocationById(int id, CancellationToken ct)
        {
            var result = await _service.GetBinLocationByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Bin location not found." });

            return Ok(result);
        }

        [HttpPost("bin-locations")]
        public async Task<IActionResult> CreateBinLocation([FromBody] UpsertBinLocationDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateBinLocationAsync(request, ct);
                return Ok(new { message = "Bin location created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("bin-locations/{id:int}")]
        public async Task<IActionResult> UpdateBinLocation(int id, [FromBody] UpsertBinLocationDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateBinLocationAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Bin location not found." });

                return Ok(new { message = "Bin location updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("bin-locations/{id:int}")]
        public async Task<IActionResult> DeleteBinLocation(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteBinLocationAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Bin location not found." });

                return Ok(new { message = "Bin location deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // =========================================================
        // PROJECTS
        // =========================================================

        [HttpGet("projects")]
        public async Task<IActionResult> GetProjects([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetProjectsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("projects/{id:int}")]
        public async Task<IActionResult> GetProjectById(int id, CancellationToken ct)
        {
            var result = await _service.GetProjectByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Project not found." });

            return Ok(result);
        }

        [HttpPost("projects")]
        public async Task<IActionResult> CreateProject([FromBody] UpsertProjectDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateProjectAsync(request, ct);
                return Ok(new { message = "Project created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("projects/{id:int}")]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] UpsertProjectDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateProjectAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Project not found." });

                return Ok(new { message = "Project updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("projects/{id:int}/status")]
        public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] ProjectStatusUpdateDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateProjectStatusAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Project not found." });

                return Ok(new { message = "Project status updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("projects/{id:int}")]
        public async Task<IActionResult> DeleteProject(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteProjectAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Project not found." });

                return Ok(new { message = "Project deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
        // =========================================================
        // SUPPLIER CONTRACT
        // =========================================================

        [HttpGet("supplier-contracts")]
        public async Task<IActionResult> GetSupplierContracts([FromQuery] MasterDataQueryDto query, CancellationToken ct)
        {
            var result = await _service.GetSupplierContractsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("supplier-contracts/{id:int}")]
        public async Task<IActionResult> GetSupplierContractById(int id, CancellationToken ct)
        {
            var result = await _service.GetSupplierContractByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { message = "Supplier contract not found." });

            return Ok(result);
        }

        [HttpPost("supplier-contracts")]
        public async Task<IActionResult> CreateSupplierContract([FromBody] UpsertSupplierContractDto request, CancellationToken ct)
        {
            try
            {
                var id = await _service.CreateSupplierContractAsync(request, ct);
                return Ok(new { message = "Supplier contract created successfully.", id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("supplier-contracts/{id:int}")]
        public async Task<IActionResult> UpdateSupplierContract(int id, [FromBody] UpsertSupplierContractDto request, CancellationToken ct)
        {
            try
            {
                var ok = await _service.UpdateSupplierContractAsync(id, request, ct);
                if (!ok)
                    return NotFound(new { message = "Supplier contract not found." });

                return Ok(new { message = "Supplier contract updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("supplier-contracts/{id:int}")]
        public async Task<IActionResult> DeleteSupplierContract(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteSupplierContractAsync(id, ct);
                if (!ok)
                    return NotFound(new { message = "Supplier contract not found." });

                return Ok(new { message = "Supplier contract deleted successfully." });
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("supplier-contracts/supplier/{supplierId:int}")]
        public async Task<IActionResult> GetSupplierContractsBySupplierId(int supplierId, CancellationToken ct)
        {
            var result = await _service.GetSupplierContractsBySupplierIdAsync(supplierId, ct);
            return Ok(result);
        }
    }
}
