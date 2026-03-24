-- Add stamp/close fields to Receipts
IF COL_LENGTH('dbo.Receipts', 'StampedByManagerId') IS NULL
BEGIN
    ALTER TABLE dbo.Receipts
    ADD StampedByManagerId INT NULL;
END

IF COL_LENGTH('dbo.Receipts', 'StampedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Receipts
    ADD StampedAt DATETIME NULL;
END

IF COL_LENGTH('dbo.Receipts', 'StampNotes') IS NULL
BEGIN
    ALTER TABLE dbo.Receipts
    ADD StampNotes NVARCHAR(500) NULL;
END

IF COL_LENGTH('dbo.Receipts', 'ClosedByAccountantId') IS NULL
BEGIN
    ALTER TABLE dbo.Receipts
    ADD ClosedByAccountantId INT NULL;
END

IF COL_LENGTH('dbo.Receipts', 'AccountingNote') IS NULL
BEGIN
    ALTER TABLE dbo.Receipts
    ADD AccountingNote NVARCHAR(500) NULL;
END
