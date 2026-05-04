-- Create ReceiptSignatures table and constraints (idempotent)

IF OBJECT_ID('dbo.ReceiptSignatures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReceiptSignatures (
        SignatureID BIGINT IDENTITY(1,1) NOT NULL,
        ReceiptID BIGINT NOT NULL,
        UserID INT NOT NULL,
        Role VARCHAR(20) NOT NULL,
        SignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ReceiptSignatures_SignedAt DEFAULT (sysdatetime()),
        SignatureData NVARCHAR(MAX) NULL,
        CONSTRAINT PK_ReceiptSignatures PRIMARY KEY (SignatureID)
    );
END

IF OBJECT_ID('dbo.ReceiptSignatures', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptSignatures_ReceiptID'
          AND object_id = OBJECT_ID('dbo.ReceiptSignatures')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ReceiptSignatures_ReceiptID
        ON dbo.ReceiptSignatures (ReceiptID);
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReceiptSignatures_UserID'
          AND object_id = OBJECT_ID('dbo.ReceiptSignatures')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ReceiptSignatures_UserID
        ON dbo.ReceiptSignatures (UserID);
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_ReceiptSignatures_Receipt_Role'
          AND object_id = OBJECT_ID('dbo.ReceiptSignatures')
    )
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX UX_ReceiptSignatures_Receipt_Role
        ON dbo.ReceiptSignatures (ReceiptID, Role);
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptSignatures_Receipts'
          AND parent_object_id = OBJECT_ID('dbo.ReceiptSignatures')
    )
    BEGIN
        ALTER TABLE dbo.ReceiptSignatures
        ADD CONSTRAINT FK_ReceiptSignatures_Receipts
        FOREIGN KEY (ReceiptID)
        REFERENCES dbo.Receipts (ReceiptID);
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_ReceiptSignatures_Users'
          AND parent_object_id = OBJECT_ID('dbo.ReceiptSignatures')
    )
    BEGIN
        ALTER TABLE dbo.ReceiptSignatures
        ADD CONSTRAINT FK_ReceiptSignatures_Users
        FOREIGN KEY (UserID)
        REFERENCES dbo.Users (UserID);
    END
END
