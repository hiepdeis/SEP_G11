-- Add PO revision fields and self-referencing relationship

IF COL_LENGTH('dbo.PurchaseOrders', 'ParentPOID') IS NULL
    ALTER TABLE dbo.PurchaseOrders
    ADD ParentPOID BIGINT NULL;

IF COL_LENGTH('dbo.PurchaseOrders', 'RevisionNumber') IS NULL
BEGIN
    ALTER TABLE dbo.PurchaseOrders
    ADD RevisionNumber INT NOT NULL
        CONSTRAINT DF_PurchaseOrders_RevisionNumber DEFAULT (1);
END
ELSE
BEGIN
    UPDATE dbo.PurchaseOrders
    SET RevisionNumber = 1
    WHERE RevisionNumber IS NULL;

    ALTER TABLE dbo.PurchaseOrders
    ALTER COLUMN RevisionNumber INT NOT NULL;
END

IF COL_LENGTH('dbo.PurchaseOrders', 'RevisionNote') IS NULL
    ALTER TABLE dbo.PurchaseOrders
    ADD RevisionNote NVARCHAR(500) NULL;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_PurchaseOrders_ParentPO'
)
BEGIN
    ALTER TABLE dbo.PurchaseOrders
    ADD CONSTRAINT FK_PurchaseOrders_ParentPO
    FOREIGN KEY (ParentPOID) REFERENCES dbo.PurchaseOrders(PurchaseOrderID)
    ON DELETE NO ACTION;
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_PurchaseOrders_ParentPOID'
      AND object_id = OBJECT_ID('dbo.PurchaseOrders')
)
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_ParentPOID
    ON dbo.PurchaseOrders (ParentPOID);
