using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace Backend.Domains.catalog
{
  
    [Route("api/[controller]")]
    [ApiController]
    public class SuppliersController : ControllerBase
    {

        private readonly MyDbContext _context;

        public SuppliersController(MyDbContext context)
        {
            _context = context;
        }

        // GET: api/Suppliers
        [HttpGet]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers
                .Select(x => new SupplierDto
                {
                    SupplierId = x.SupplierId,
                    Code = x.Code,
                    Name = x.Name
                })
                .OrderBy(x => x.Name)
                .ToListAsync();

            return Ok(suppliers);
        }

    }
}
