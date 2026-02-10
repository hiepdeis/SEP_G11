using Backend.Data;
using Backend.Domains.auth.Business;
using Backend.Domains.auth.Interfaces;
using Backend.Domains.auth.Services;
using Backend.Domains.user.Interface;
//using Backend.Domains.user.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json",
                  optional: true, reloadOnChange: true);

builder.Services.AddDbContext<MyDbContext>(options =>
              options.UseSqlServer(
                  builder.Configuration.GetConnectionString("DefaultConnection")
                 // ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
              ));
// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
//builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<GoogleOAuthService>();
//builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IGoogleOAuthService, GoogleOAuthService>();
builder.Services.AddScoped<IAuthorizationHandler, ActiveUserAuthorizationHandler>();

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// create custom Authorization Policy
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ActiveUserOnly", policy =>
        policy.Requirements.Add(new ActiveUserRequirement()));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
          policy.WithOrigins("http://localhost:3000")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    await SeedData.InitializeAsync(context);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
