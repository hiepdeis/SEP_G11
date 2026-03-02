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