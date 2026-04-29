using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Domains.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/materials")]
    [Authorize(Policy = "ActiveUserOnly")]
    public class MaterialsAdminController : ControllerBase
    {
        private readonly IMaterialService _materialService;

        public MaterialsAdminController(IMaterialService materialService)
        {
            _materialService = materialService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMaterials([FromQuery] GetMaterialsQuery query, CancellationToken ct)
        {
            var result = await _materialService.GetMaterialsAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("{materialId:int}")]
        public async Task<IActionResult> GetById([FromRoute] int materialId, CancellationToken ct)
        {
            var result = await _materialService.GetByIdAsync(materialId, ct);
            if (result == null)
                return NotFound(new { message = "Material not found." });

            return Ok(result);
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMaterialRequest request, CancellationToken ct)
        {
            try
            {
                var materialId = await _materialService.CreateAsync(request, ct);

                return CreatedAtAction(
                    nameof(GetById),
                    new { materialId },
                    new
                    {
                        message = "Tạo vật tư thành công.",
                        materialId
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpPut("{materialId:int}")]
        public async Task<IActionResult> Update([FromRoute] int materialId, [FromBody] UpdateMaterialRequest request, CancellationToken ct)
        {
            try
            {
                var success = await _materialService.UpdateAsync(materialId, request, ct);
                if (!success)
                    return NotFound(new { message = "Material not found." });

                return Ok(new { message = "Cập nhật vật tư thành công." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpDelete("{materialId:int}")]
        public async Task<IActionResult> Delete([FromRoute] int materialId, CancellationToken ct)
        {
            var result = await _materialService.DeleteAsync(materialId, ct);
            if (!result.success)
                return BadRequest(new { message = result.message });

            return Ok(new { message = result.message });
        }

        [HttpGet("{materialId:int}/inventory")]
        public async Task<IActionResult> GetInventoryByMaterial([FromRoute] int materialId, CancellationToken ct)
        {
            var result = await _materialService.GetInventoryByMaterialAsync(materialId, ct);
            return Ok(result);
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpPost("{materialId:int}/inventory")]
        public async Task<IActionResult> CreateInventory(
            [FromRoute] int materialId,
            [FromBody] CreateMaterialInventoryRequest request,
            CancellationToken ct)
        {
            try
            {
                var inventoryId = await _materialService.CreateInventoryAsync(materialId, request, ct);

                return Ok(new
                {
                    message = "Tạo vị trí tồn kho thành công.",
                    inventoryId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpPut("{materialId:int}/inventory/{inventoryId:int}")]
        public async Task<IActionResult> UpdateInventory(
            [FromRoute] int materialId,
            [FromRoute] int inventoryId,
            [FromBody] UpdateMaterialInventoryRequest request,
            CancellationToken ct)
        {
            try
            {
                var success = await _materialService.UpdateInventoryAsync(materialId, inventoryId, request, ct);
                if (!success)
                    return NotFound(new { message = "Inventory row not found." });

                return Ok(new { message = "Cập nhật vị trí tồn kho thành công." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin, WarehouseManager")]
        [HttpDelete("{materialId:int}/inventory/{inventoryId:int}")]
        public async Task<IActionResult> DeleteInventory(
            [FromRoute] int materialId,
            [FromRoute] int inventoryId,
            CancellationToken ct)
        {
            var result = await _materialService.DeleteInventoryAsync(materialId, inventoryId, ct);
            if (!result.success)
                return NotFound(new { message = result.message });

            return Ok(new { message = result.message });
        }
    }
}