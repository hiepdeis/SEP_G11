
using Backend.Data;
using Backend.Domains.Admin.Interface;
using Backend.Domains.Admin.Services;
using Backend.Domains.Audit.Interfaces;
using Backend.Domains.Audit.Services;
using Backend.Domains.auth.Business;
using Backend.Domains.auth.Interfaces;
using Backend.Domains.auth.Services;
using Backend.Domains.Import.Interfaces;
using Backend.Domains.Import.Services;
using Backend.Domains.user.Interface;
using Backend.Domains.user.Service;
using Backend.Entities;
using Backend.Filters;
using Backend.Options;
using Backend.Services.Email;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NuGet.Packaging;
using OfficeOpenXml;
using System;
using System.Text;
using Backend.Domains.Projects.Interfaces;
using Backend.Domains.Projects.Services;

var builder = WebApplication.CreateBuilder(args);

ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json",
                  optional: true, reloadOnChange: true);



builder.Services.AddDbContext<MyDbContext>(options =>
              options.UseSqlServer(
                  builder.Configuration.GetConnectionString("DefaultConnection")
              //ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
              ));
// Add services to the container.

builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection(EmailOptions.SectionName));

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

builder.Services.AddScoped<IAuditReportService, AuditReportService>();
builder.Services.AddScoped<IAuditNotificationService, AuditNotificationService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<GoogleOAuthService>();
//builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuditPlanService, AuditPlanService>();
builder.Services.AddScoped<IAuditTeamService, AuditTeamService>();
builder.Services.AddScoped<IStockTakeReviewService, StockTakeReviewService>();
builder.Services.AddScoped<IStockTakeCountingService, StockTakeCountingService>();
builder.Services.AddScoped<IStockTakeLockService, StockTakeLockService>();


//  Import services
builder.Services.AddScoped<IStockShortageAlertService, StockShortageAlertService>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<IPurchaseRequestService, PurchaseRequestService>();
builder.Services.AddScoped<IIncidentWorkflowService, IncidentWorkflowService>();
builder.Services.AddScoped<ISupplierService, SupplierService>();

// Configure Swagger to support file uploads
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MatCost API",
        Version = "v1",
        Description = "Construction Warehouse Management System API"
    });

    // Support JWT Authorization in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    c.OperationFilter<FileUploadOperationFilter>();
});

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBinLocationService, BinLocationService>();
builder.Services.AddScoped<IGoogleOAuthService, GoogleOAuthService>();
builder.Services.AddScoped<GoogleLoginHandler>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<IAuthorizationHandler, ActiveUserAuthorizationHandler>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IMaterialService, MaterialService>();
builder.Services.AddScoped<IMasterDataService, MasterDataService>();
builder.Services.AddScoped<INotificationAdminService, NotificationAdminService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
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

builder.Services.AddScoped<IProjectService, ProjectService>();

var app = builder.Build();


using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    await SeedData.InitializeAsync(context);
    await SeedData1.InitializeAsync(context);
}


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MatCost API v1");
        c.RoutePrefix = "swagger";
    });
}

if (!app.Environment.IsDevelopment())
{
    // Local frontend/auth currently call the API over http://localhost:5000.
    // Redirecting dev requests to HTTPS breaks browser preflight requests.
    app.UseHttpsRedirection();
}
app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
