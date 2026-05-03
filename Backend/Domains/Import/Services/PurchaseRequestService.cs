using System;
using Backend.Data;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Backend.Services.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Domains.Import.Services
{
    public class PurchaseRequestService : IPurchaseRequestService
    {
        private readonly MyDbContext _context;
        private readonly ILogger<PurchaseRequestService> _logger;

        private readonly INotificationDispatcher _notificationDispatcher;

        public PurchaseRequestService(MyDbContext context, ILogger<PurchaseRequestService> logger, INotificationDispatcher notificationDispatcher)
        {
            _context = context;
            _logger = logger;
            _notificationDispatcher = notificationDispatcher;
        }

        public async Task<PurchaseRequest> CreateRequestFromAlertAsync(long alertId, int adminId, List<PurchaseRequestItem> items)
        {
            if (items == null)
                items = new List<PurchaseRequestItem>();

            var alert = await _context.StockShortageAlerts
                .FirstOrDefaultAsync(a => a.AlertId == alertId);

            if (alert == null)
                throw new KeyNotFoundException($"Alert with ID {alertId} not found");

            if (alert.Status == "PRCreated")
                throw new InvalidOperationException("PR da duoc tao cho Alert nay roi");

            if (alert.Status != "ManagerConfirmed")
                throw new InvalidOperationException(
                    $"Alert {alertId} must be ManagerConfirmed before creating PR. Current status: {alert.Status}");

            // var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
            // if (!projectExists)
            //     throw new KeyNotFoundException($"Project with ID {projectId} not found");

            if (items.Count == 0)
            {
                var quantity = alert.SuggestedQuantity;
                if (!quantity.HasValue || quantity.Value <= 0)
                    throw new ArgumentException("Quantity must be greater than 0");

                items.Add(new PurchaseRequestItem
                {
                    MaterialId = alert.MaterialId,
                    Quantity = quantity.Value
                });
            }

            foreach (var item in items)
            {
                if (item.Quantity <= 0)
                    throw new ArgumentException("Item quantity must be greater than 0");
            }

            var requestCode = await GenerateRequestCodeAsync();
            var now = DateTime.UtcNow;

            var request = new PurchaseRequest
            {
                RequestCode = requestCode,
                // ProjectId = projectId,
                AlertId = alertId,
                CreatedBy = adminId,
                CreatedAt = now,
                Status = "Submitted",
                Items = items.Select(i => new PurchaseRequestItem
                {
                    MaterialId = i.MaterialId,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList()
            };

            _context.PurchaseRequests.Add(request);

            alert.Status = "PRCreated";

            await _context.SaveChangesAsync();

            await _notificationDispatcher.DispatchToRoleAsync(new NotificationRoleDispatchRequest
            {
                RoleName = "Purchasing",
                FallbackRoleName = "WarehouseManager",
                OnlyActiveUsers = true,
                Message = $"Yêu cầu mua hàng có mã: {request.RequestCode} đã được tạo bởi Giám Đốc với cảnh báo có id: {alert.AlertId}.",
                RelatedEntityType = "PurchaseRequest",
                RelatedEntityId = request.RequestId,
                SendEmail = true,
                SendEmailInBackground = true,
                SaveChanges = true
            }, CancellationToken.None);

            return request;
        }

        // For admin want to view all purchase requests
        public async Task<List<PurchaseRequest>> GetRequestsAsync()
        {
            return await _context.PurchaseRequests
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<PurchaseRequest>> GetPendingRequestsAsync()
        {
            // var rejectedStatuses = new[] { "AdminRejected", "AccountantRejected" };

            return await _context.PurchaseRequests
                .Include(r => r.PurchaseOrders)
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .Where(r => r.Status == "Submitted" || r.Status == "DraftPO")
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<PurchaseRequest?> GetRequestAsync(long requestId)
        {
            return await _context.PurchaseRequests
                .Include(r => r.Project)
                .Include(r => r.Alert)
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RequestId == requestId);
        }

        public async Task<PurchaseRequest> UpdateStatusAsync(long requestId, string status)
        {
            if (string.IsNullOrWhiteSpace(status))
                throw new ArgumentException("Status is required", nameof(status));

            var request = await _context.PurchaseRequests
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var oldStatus = request.Status;
            request.Status = status;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "PurchaseRequest {RequestId} status changed from {OldStatus} to {NewStatus}",
                requestId,
                oldStatus,
                status);

            return request;
        }

        private async Task<string> GenerateRequestCodeAsync()
        {
            var today = DateTime.UtcNow;
            var prefix = $"PR{today:yyyyMMdd}";

            var count = await _context.PurchaseRequests
                .CountAsync(r => r.RequestCode.StartsWith(prefix));

            return $"{prefix}-{(count + 1):D4}";
        }
    }
}