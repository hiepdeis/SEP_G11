namespace Backend.Domains.Import.DTOs.Staff
{
    public class WarehouseCardDto
    {
        public long CardId { get; set; }
        public string CardCode { get; set; } = string.Empty;

        public int WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        public int MaterialId { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public string? MaterialUnit { get; set; }

        public int BinId { get; set; }
        public string? BinCode { get; set; }

        public int BatchId { get; set; }
        public string? BatchCode { get; set; }

        // import, export, stocktake, loss, transfer
        public string TransactionType { get; set; } = string.Empty;

        // ID của Receipt, IssueSlip, StockTake, LossReport, TransferOrder tương ứng với TransactionType
        public long ReferenceId { get; set; }

        // Receipt , IssueSlip, StockTake, LossReport, TransferOrder entity name
        public string ReferenceType { get; set; } = string.Empty;

        public DateTime TransactionDate { get; set; }
        public decimal Quantity { get; set; }
        public decimal QuantityBefore { get; set; }
        public decimal QuantityAfter { get; set; }

        public int CreatedBy { get; set; }
        public string? CreatedByName { get; set; }

        public string? Notes { get; set; }
    }

    public class WarehouseCardQueryDto
    {
        public int? WarehouseId { get; set; }
        public int? MaterialId { get; set; }
        public int? BinId { get; set; }
        public long? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>"Import" | "Export" | null (all)</summary>
        public string? TransactionType { get; set; }
    }
}