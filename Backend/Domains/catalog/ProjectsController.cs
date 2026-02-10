using Backend.Data;
using Backend.Domains.catalog.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.catalog
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectsController : ControllerBase
    {
        private readonly MyDbContext _context;

        public ProjectsController(MyDbContext context)
        {
            _context = context;
        }

        // GET: api/projects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
        {
            return await _context.Projects.ToListAsync();
        }

        // GET: api/projects/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Project>> GetProject(int id)
        {
            var project = await _context.Projects.FindAsync(id);

            if (project == null)
                return NotFound();

            return project;
        }

        // POST: api/projects
        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(CreateProjectDto dto)
        {
            var project = new Project
            {
                Code = dto.Code,
                Name = dto.Name,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Budget = dto.Budget,
                Status = dto.Status
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetProject),
                new { id = project.ProjectId },
                project
            );
        }
    }
}
