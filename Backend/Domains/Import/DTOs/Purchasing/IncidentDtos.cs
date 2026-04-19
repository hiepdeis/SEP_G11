using System;
using System.Collections.Generic;
using Backend.Domains.Import.DTOs.Staff;

namespace Backend.Domains.Import.DTOs.Purchasing
{
    public class PurchasingIncidentSummaryDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;
        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchasingIncidentItemSummaryDto> Items { get; set; } = new();
    }

    public class PurchasingIncidentItemSummaryDto
    {
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public decimal? OrderedQuantity { get; set; }
        public decimal? ActualQuantity { get; set; }
        public decimal PassQuantity { get; set; }
        public decimal FailQuantity { get; set; }
        public decimal? FailQuantityQuantity { get; set; }
        public decimal? FailQuantityQuality { get; set; }
        public decimal? FailQuantityDamage { get; set; }
        public string? FailReason { get; set; }
        public List<string> EvidenceImages { get; set; } = new();
    }

    public class PurchasingIncidentDetailDto
    {
        public long IncidentId { get; set; }
        public string IncidentCode { get; set; } = string.Empty;
        public long ReceiptId { get; set; }
        public string? ReceiptCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public QCCheckDto? QCCheck { get; set; }
        public List<PurchasingIncidentItemSummaryDto> Items { get; set; } = new();
        public List<SupplementaryRevisionHistoryItemDto> SupplementaryRevisionHistory { get; set; } = new();
    }

    public class CreateSupplementaryReceiptDto
    {
        public string SupplierNote { get; set; } = string.Empty;
        public DateTime? ExpectedDeliveryDate { get; set; }
        public List<CreateSupplementaryReceiptItemDto> Items { get; set; } = new();
    }

    public class CreateSupplementaryReceiptItemDto
    {
        public int MaterialId { get; set; }
        public decimal SupplementaryQuantity { get; set; }
    }

    public class SupplementaryReceiptResultDto
    {
        public long SupplementaryReceiptId { get; set; }
        public long PurchaseOrderId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalSupplementaryQty { get; set; }
        public string NextStep { get; set; } = string.Empty;
    }
}
