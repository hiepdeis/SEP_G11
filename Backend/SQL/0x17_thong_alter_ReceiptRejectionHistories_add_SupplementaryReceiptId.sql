-- Add SupplementaryReceiptId to rejection history for supplementary receipt reject flow.
-- Safe to run multiple times.

-- Handle pluralized table name.
IF OBJECT_ID('dbo.ReceiptRejectionHistories', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ReceiptRejectionHistories', 'SupplementaryReceiptId') IS NULL
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistories
        ADD SupplementaryReceiptId BIGINT NULL;

        PRINT 'Added ReceiptRejectionHistories.SupplementaryReceiptId.';
    END
    ELSE
    BEGIN
        PRINT 'ReceiptRejectionHistories.SupplementaryReceiptId already exists.';
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptRejectionHistories_SupplementaryReceiptId'
          AND object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ReceiptRejectionHistories_SupplementaryReceiptId
        ON dbo.ReceiptRejectionHistories (SupplementaryReceiptId);

        PRINT 'Created IX_ReceiptRejectionHistories_SupplementaryReceiptId.';
    END

    IF OBJECT_ID('dbo.SupplementaryReceipts', 'U') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM sys.foreign_keys
           WHERE name = 'FK_ReceiptRejectionHistories_SupplementaryReceipts_SupplementaryReceiptId'
             AND parent_object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
       )
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistories
        ADD CONSTRAINT FK_ReceiptRejectionHistories_SupplementaryReceipts_SupplementaryReceiptId
        FOREIGN KEY (SupplementaryReceiptId)
        REFERENCES dbo.SupplementaryReceipts (SupplementaryReceiptID);

        PRINT 'Created FK_ReceiptRejectionHistories_SupplementaryReceipts_SupplementaryReceiptId.';
    END
END

-- Handle singular table name.
IF OBJECT_ID('dbo.ReceiptRejectionHistory', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ReceiptRejectionHistory', 'SupplementaryReceiptId') IS NULL
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistory
        ADD SupplementaryReceiptId BIGINT NULL;

        PRINT 'Added ReceiptRejectionHistory.SupplementaryReceiptId.';
    END
    ELSE
    BEGIN
        PRINT 'ReceiptRejectionHistory.SupplementaryReceiptId already exists.';
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptRejectionHistory_SupplementaryReceiptId'
          AND object_id = OBJECT_ID('dbo.ReceiptRejectionHistory')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ReceiptRejectionHistory_SupplementaryReceiptId
        ON dbo.ReceiptRejectionHistory (SupplementaryReceiptId);

        PRINT 'Created IX_ReceiptRejectionHistory_SupplementaryReceiptId.';
    END

    IF OBJECT_ID('dbo.SupplementaryReceipts', 'U') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM sys.foreign_keys
           WHERE name = 'FK_ReceiptRejectionHistory_SupplementaryReceipts_SupplementaryReceiptId'
             AND parent_object_id = OBJECT_ID('dbo.ReceiptRejectionHistory')
       )
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistory
        ADD CONSTRAINT FK_ReceiptRejectionHistory_SupplementaryReceipts_SupplementaryReceiptId
        FOREIGN KEY (SupplementaryReceiptId)
        REFERENCES dbo.SupplementaryReceipts (SupplementaryReceiptID);

        PRINT 'Created FK_ReceiptRejectionHistory_SupplementaryReceipts_SupplementaryReceiptId.';
    END
END
