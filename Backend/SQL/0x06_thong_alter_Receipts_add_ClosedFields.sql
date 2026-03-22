IF COL_LENGTH('Receipts', 'ClosedBy') IS NULL
BEGIN
    ALTER TABLE Receipts ADD ClosedBy int NULL;
END;

IF COL_LENGTH('Receipts', 'ClosedAt') IS NULL
BEGIN
    ALTER TABLE Receipts ADD ClosedAt datetime NULL;
END;

IF COL_LENGTH('Receipts', 'AccountantNotes') IS NULL
BEGIN
    ALTER TABLE Receipts ADD AccountantNotes nvarchar(500) NULL;
END;
