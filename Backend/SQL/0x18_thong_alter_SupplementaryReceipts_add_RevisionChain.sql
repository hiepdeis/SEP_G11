-- Add revision chain fields for SupplementaryReceipts.
-- Safe to run multiple times.

IF OBJECT_ID('dbo.SupplementaryReceipts', 'U') IS NULL
BEGIN
    PRINT 'Table dbo.SupplementaryReceipts not found.';
    RETURN;
END

IF COL_LENGTH('dbo.SupplementaryReceipts', 'ParentReceiptID') IS NULL
BEGIN
    ALTER TABLE dbo.SupplementaryReceipts
    ADD ParentReceiptID BIGINT NULL;

    PRINT 'Added SupplementaryReceipts.ParentReceiptID.';
END
ELSE
BEGIN
    PRINT 'SupplementaryReceipts.ParentReceiptID already exists.';
END

IF COL_LENGTH('dbo.SupplementaryReceipts', 'RevisionNumber') IS NULL
BEGIN
    ALTER TABLE dbo.SupplementaryReceipts
    ADD RevisionNumber INT NOT NULL
        CONSTRAINT DF_SupplementaryReceipts_RevisionNumber DEFAULT (1);

    PRINT 'Added SupplementaryReceipts.RevisionNumber with default 1.';
END
ELSE
BEGIN
    -- Ensure existing nullable column is normalized if schema drift exists.
    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.SupplementaryReceipts')
          AND name = 'RevisionNumber'
          AND is_nullable = 1
    )
    BEGIN
        UPDATE dbo.SupplementaryReceipts
        SET RevisionNumber = 1
        WHERE RevisionNumber IS NULL;

        ALTER TABLE dbo.SupplementaryReceipts
        ALTER COLUMN RevisionNumber INT NOT NULL;

        PRINT 'Normalized SupplementaryReceipts.RevisionNumber to NOT NULL.';
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c
            ON c.object_id = dc.parent_object_id
           AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.SupplementaryReceipts')
          AND c.name = 'RevisionNumber'
    )
    BEGIN
        ALTER TABLE dbo.SupplementaryReceipts
        ADD CONSTRAINT DF_SupplementaryReceipts_RevisionNumber DEFAULT (1) FOR RevisionNumber;

        PRINT 'Added default constraint for SupplementaryReceipts.RevisionNumber.';
    END
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_SupplementaryReceipts_ParentReceiptID'
      AND object_id = OBJECT_ID('dbo.SupplementaryReceipts')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SupplementaryReceipts_ParentReceiptID
    ON dbo.SupplementaryReceipts (ParentReceiptID);

    PRINT 'Created IX_SupplementaryReceipts_ParentReceiptID.';
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_SupplementaryReceipts_SupplementaryReceipts_ParentReceiptID'
      AND parent_object_id = OBJECT_ID('dbo.SupplementaryReceipts')
)
BEGIN
    ALTER TABLE dbo.SupplementaryReceipts
    ADD CONSTRAINT FK_SupplementaryReceipts_SupplementaryReceipts_ParentReceiptID
    FOREIGN KEY (ParentReceiptID)
    REFERENCES dbo.SupplementaryReceipts (SupplementaryReceiptID);

    PRINT 'Created FK_SupplementaryReceipts_SupplementaryReceipts_ParentReceiptID.';
END
