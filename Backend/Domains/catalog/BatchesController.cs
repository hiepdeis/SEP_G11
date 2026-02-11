using Backend.Data;
using Backend.Domains.catalog.Dtos;
using Backend.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.catalog
{
    [Route("api/[controller]")]
    [ApiController]
    public class BatchesController : ControllerBase
    {
        private readonly MyDbContext _context;

        public BatchesController(MyDbContext context)
        {
            _context = context;
        }

        // GET: api/batches
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Batch>>> GetBatches()
        {
            return await _context.Batches
                .Include(b => b.Material) // nếu không cần thì bỏ
                .ToListAsync();
        }

        // GET: api/batches/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Batch>> GetBatch(int id)
        {
            var batch = await _context.Batches
                .Include(b => b.Material)
                .FirstOrDefaultAsync(b => b.BatchId == id);

            if (batch == null)
                return NotFound();

            return batch;
        }

        // POST: api/batches
        [HttpPost]
        public async Task<ActionResult<Batch>> CreateBatch(CreateBatchDto dto)
        {
            // Check Material tồn tại
            var materialExists = await _context.Materials
                .AnyAsync(m => m.MaterialId == dto.MaterialId);

            if (!materialExists)
                return BadRequest("MaterialId không tồn tại");

            var batch = new Batch
            {
                MaterialId = dto.MaterialId,
                BatchCode = dto.BatchCode,
                MfgDate = dto.MfgDate,
                CertificateImage = dto.CertificateImage,
                CreatedDate = DateTime.UtcNow
            };

            _context.Batches.Add(batch);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetBatch),
                new { id = batch.BatchId },
                batch
            );
        }
    }
}
