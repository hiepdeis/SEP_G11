-- Add ExpiryDate to Batches
IF COL_LENGTH('dbo.Batches', 'ExpiryDate') IS NULL
    ALTER TABLE dbo.Batches
    ADD ExpiryDate DATETIME NULL;

-- Create ReceiptDetailBinAllocations
IF OBJECT_ID('dbo.ReceiptDetailBinAllocations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReceiptDetailBinAllocations (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        ReceiptDetailID BIGINT NOT NULL,
        BinID INT NOT NULL,
        Quantity DECIMAL(18,4) NOT NULL,
        BatchID INT NOT NULL,
        CONSTRAINT PK_ReceiptDetailBinAllocations PRIMARY KEY (Id),
        CONSTRAINT FK_ReceiptDetailBinAllocations_ReceiptDetails
            FOREIGN KEY (ReceiptDetailID) REFERENCES dbo.ReceiptDetails(DetailID) ON DELETE CASCADE,
        CONSTRAINT FK_ReceiptDetailBinAllocations_BinLocations
            FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID),
        CONSTRAINT FK_ReceiptDetailBinAllocations_Batches
            FOREIGN KEY (BatchID) REFERENCES dbo.Batches(BatchID)
    );

    CREATE INDEX IX_ReceiptDetailBinAllocations_ReceiptDetailID
        ON dbo.ReceiptDetailBinAllocations (ReceiptDetailID);
    CREATE INDEX IX_ReceiptDetailBinAllocations_BinID
        ON dbo.ReceiptDetailBinAllocations (BinID);
    CREATE INDEX IX_ReceiptDetailBinAllocations_BatchID
        ON dbo.ReceiptDetailBinAllocations (BatchID);
END
