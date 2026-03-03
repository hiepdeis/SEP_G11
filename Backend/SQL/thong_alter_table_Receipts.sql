ALTER TABLE Receipts
ALTER COLUMN WarehouseID INT NULL;

------------------------------------------------
CREATE TABLE ReceiptRejectionHistory (
    Id            BIGINT PRIMARY KEY IDENTITY,
    ReceiptId     BIGINT NOT NULL,
    RejectedBy    INT NOT NULL,
    RejectedAt    DATETIME NOT NULL,
    RejectionReason NVARCHAR(500),
    -- FK
    FOREIGN KEY (ReceiptId) REFERENCES Receipts(ReceiptId)
)

------------------------------------------------
ALTER TABLE InventoryCurrents ALTER COLUMN WarehouseID INT NULL; 


------------------------------------------------
ALTER TABLE Receipts DROP COLUMN Notes;

ALTER TABLE Receipts
ADD 
    RejectedBy INT NULL,
    RejectedAt DATETIME NULL,
    ConfirmedBy INT NULL,
    ImportedCompleteNote NVARCHAR(500) NULL,
    RejectionReason NVARCHAR(500) NULL,
    AccountantNotes NVARCHAR(500) NULL,
    BackorderReason NVARCHAR(500) NULL;