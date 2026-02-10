using Backend.Data;
using Backend.Domains.catalog.Dtos;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.catalog
{
    [Route("api/[controller]")]
    [ApiController]
    public class MaterialsController : ControllerBase
    {
        private readonly MyDbContext _context;

        public MaterialsController(MyDbContext context)
        {
            _context = context;
        }

        // GET: api/Material
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Material>>> GetMaterials()
        {
            return await _context.Materials.ToListAsync();
        }

        // GET: api/Material/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Material>> GetMaterial(int id)
        {
            var material = await _context.Materials.FindAsync(id);
            if (material == null)
                return NotFound();
            return material;
        }

        // POST: api/Material
        [HttpPost]
        public async Task<ActionResult<Material>> PostMaterial(CreateMaterialDto dto)
        {
            var material = new Material
            {
                Code = dto.Code,
                Name = dto.Name,
                Unit = dto.Unit,
                MassPerUnit = dto.MassPerUnit,
                MinStockLevel = dto.MinStockLevel
            };

            _context.Materials.Add(material);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetMaterial),
                new { id = material.MaterialId },
                material
            );
        }

        // PUT: api/Material/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMaterial(int id, Material material)
        {
            if (id != material.MaterialId)
                return BadRequest();

            _context.Entry(material).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Materials.Any(e => e.MaterialId == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }
    }
}
