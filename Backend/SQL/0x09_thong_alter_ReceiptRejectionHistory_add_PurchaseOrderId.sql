-- Add PurchaseOrderId and allow null ReceiptId for ReceiptRejectionHistory/ReceiptRejectionHistories

-- Handle pluralized table name
IF OBJECT_ID('dbo.ReceiptRejectionHistories', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ReceiptRejectionHistories', 'PurchaseOrderId') IS NULL
        ALTER TABLE dbo.ReceiptRejectionHistories
        ADD PurchaseOrderId BIGINT NULL;

    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
          AND name = 'ReceiptId'
          AND is_nullable = 0
    )
        ALTER TABLE dbo.ReceiptRejectionHistories
        ALTER COLUMN ReceiptId BIGINT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptRejectionHistories_PurchaseOrders'
    )
        ALTER TABLE dbo.ReceiptRejectionHistories
        ADD CONSTRAINT FK_ReceiptRejectionHistories_PurchaseOrders
        FOREIGN KEY (PurchaseOrderId) REFERENCES dbo.PurchaseOrders(PurchaseOrderID)
        ON DELETE CASCADE;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptRejectionHistories_PurchaseOrderId'
          AND object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
    )
        CREATE NONCLUSTERED INDEX IX_ReceiptRejectionHistories_PurchaseOrderId
        ON dbo.ReceiptRejectionHistories (PurchaseOrderId);
END

-- Handle singular table name
IF OBJECT_ID('dbo.ReceiptRejectionHistory', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ReceiptRejectionHistory', 'PurchaseOrderId') IS NULL
        ALTER TABLE dbo.ReceiptRejectionHistory
        ADD PurchaseOrderId BIGINT NULL;

    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.ReceiptRejectionHistory')
          AND name = 'ReceiptId'
          AND is_nullable = 0
    )
        ALTER TABLE dbo.ReceiptRejectionHistory
        ALTER COLUMN ReceiptId BIGINT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptRejectionHistory_PurchaseOrders'
    )
        ALTER TABLE dbo.ReceiptRejectionHistory
        ADD CONSTRAINT FK_ReceiptRejectionHistory_PurchaseOrders
        FOREIGN KEY (PurchaseOrderId) REFERENCES dbo.PurchaseOrders(PurchaseOrderID)
        ON DELETE CASCADE;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptRejectionHistory_PurchaseOrderId'
          AND object_id = OBJECT_ID('dbo.ReceiptRejectionHistory')
    )
        CREATE NONCLUSTERED INDEX IX_ReceiptRejectionHistory_PurchaseOrderId
        ON dbo.ReceiptRejectionHistory (PurchaseOrderId);
END
