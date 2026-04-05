-- Reflect migration 20260402155952_first
-- 1) Drop FK ReceiptRejectionHistories -> Receipts(ReceiptID)
-- 2) Alter ReceiptRejectionHistories.ReceiptId to NULL
-- 3) Add 3 fail quantity columns to QCCheckDetails
-- 4) Re-create FK without ON DELETE CASCADE

IF OBJECT_ID('dbo.ReceiptRejectionHistories', 'U') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptRejectionHistories_Receipts_ReceiptId'
          AND parent_object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
    )
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistories
        DROP CONSTRAINT FK_ReceiptRejectionHistories_Receipts_ReceiptId;
    END

    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
          AND name = 'ReceiptId'
          AND is_nullable = 0
    )
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistories
        ALTER COLUMN ReceiptId BIGINT NULL;
    END
END

IF OBJECT_ID('dbo.QCCheckDetails', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.QCCheckDetails', 'FailQuantityDamage') IS NULL
    BEGIN
        ALTER TABLE dbo.QCCheckDetails
        ADD FailQuantityDamage DECIMAL(18,4) NULL;
    END

    IF COL_LENGTH('dbo.QCCheckDetails', 'FailQuantityQuality') IS NULL
    BEGIN
        ALTER TABLE dbo.QCCheckDetails
        ADD FailQuantityQuality DECIMAL(18,4) NULL;
    END

    IF COL_LENGTH('dbo.QCCheckDetails', 'FailQuantityQuantity') IS NULL
    BEGIN
        ALTER TABLE dbo.QCCheckDetails
        ADD FailQuantityQuantity DECIMAL(18,4) NULL;
    END
END

IF OBJECT_ID('dbo.ReceiptRejectionHistories', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptRejectionHistories_Receipts_ReceiptId'
          AND parent_object_id = OBJECT_ID('dbo.ReceiptRejectionHistories')
    )
    BEGIN
        ALTER TABLE dbo.ReceiptRejectionHistories
        ADD CONSTRAINT FK_ReceiptRejectionHistories_Receipts_ReceiptId
        FOREIGN KEY (ReceiptId) REFERENCES dbo.Receipts(ReceiptID);
    END
END
