using System;
using System.Collections.Generic;
using Backend.Domains.Import.DTOs.Staff;

namespace Backend.Domains.Import.DTOs.Managers
{
    public class ManagerIncidentSummaryDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;
        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }
        public DateTime SubmittedAt { get; set; }
        public List<ManagerIncidentItemSummaryDto> Items { get; set; } = new();
    }

    public class ManagerIncidentItemSummaryDto
    {
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public decimal? OrderedQuantity { get; set; }
        public decimal? ActualQuantity { get; set; }
        public decimal PassQuantity { get; set; }
        public decimal FailQuantity { get; set; }
        public string? FailReason { get; set; }

        /// <summary>Fail quantity breakdown: shortage (Quantity issue)</summary>
        public decimal? FailQuantityQuantity { get; set; }

        /// <summary>Fail quantity breakdown: defects (Quality issue)</summary>
        public decimal? FailQuantityQuality { get; set; }

        /// <summary>Fail quantity breakdown: damage (Damage issue)</summary>
        public decimal? FailQuantityDamage { get; set; }
    }

    public class ManagerIncidentDetailDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;
        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public QCCheckDto? QCCheck { get; set; }
        public List<ManagerIncidentItemSummaryDto> Items { get; set; } = new();
    }

    public class ManagerApproveIncidentDto
    {
        public string? Notes { get; set; }
    }

    public class ManagerSupplementaryReceiptItemDto
    {
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public decimal SupplementaryQuantity { get; set; }
    }

    public class ManagerSupplementaryReceiptDto
    {
        public long SupplementaryReceiptId { get; set; }
        public long PurchaseOrderId { get; set; }
        public long IncidentId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? SupplierNote { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ManagerSupplementaryReceiptItemDto> Items { get; set; } = new();
    }

    public class ManagerApproveSupplementaryDto
    {
        public string? Notes { get; set; }
    }

    public class ManagerRejectSupplementaryDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class ManagerSupplementaryApprovalResultDto
    {
        public long IncidentId { get; set; }
        public decimal PassQuantityAdded { get; set; }
        public decimal SupplementaryQuantityPending { get; set; }
        public string PoStatus { get; set; } = string.Empty;
        public string NextStep { get; set; } = string.Empty;
    }

    public class ManagerSupplementaryRejectResultDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
