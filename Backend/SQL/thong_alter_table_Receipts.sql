-- Thêm cột ParentRequestID
ALTER TABLE dbo.Receipts
ADD ParentRequestID BIGINT NULL;

-- Thêm khóa ngoại self-reference
ALTER TABLE dbo.Receipts
ADD CONSTRAINT FK_Receipts_ParentRequest
FOREIGN KEY (ParentRequestID)
REFERENCES dbo.Receipts (ReceiptID);

-- Tạo index
CREATE NONCLUSTERED INDEX IX_Receipts_ParentRequestID
ON dbo.Receipts (ParentRequestID);

-- Thêm cột BinLocationID
ALTER TABLE dbo.ReceiptDetails
ADD BinLocationID INT NULL;

-- Thêm cột ActualQuantity
ALTER TABLE dbo.ReceiptDetails
ADD ActualQuantity DECIMAL(18,4) NULL;

-- Thêm khóa ngoại tới BinLocations
ALTER TABLE dbo.ReceiptDetails
ADD CONSTRAINT FK_ReceiptDetails_BinLocations
FOREIGN KEY (BinLocationID)
REFERENCES dbo.BinLocations (BinID);

-- Tạo index
CREATE NONCLUSTERED INDEX IX_ReceiptDetails_BinLocationID
ON dbo.ReceiptDetails (BinLocationID);





--/////////////////////////////////////////////////--

ALTER TABLE Receipts
ALTER COLUMN WarehouseID INT NULL;

-- Tao bang ReceiptRejectionHistory
CREATE TABLE ReceiptRejectionHistory (
    Id            BIGINT PRIMARY KEY IDENTITY,
    ReceiptId     BIGINT NOT NULL,
    RejectedBy    INT NOT NULL,
    RejectedAt    DATETIME NOT NULL,
    RejectionReason NVARCHAR(500),
    -- FK
    FOREIGN KEY (ReceiptId) REFERENCES Receipts(ReceiptId)
)

-- Them null cho WarehouseID trong InventoryCurrents
ALTER TABLE InventoryCurrents ALTER COLUMN WarehouseID INT NULL; 


-- Xóa cột Notes trong bảng Receipts
ALTER TABLE Receipts DROP COLUMN Notes;

-- Thêm các cột mới vào bảng Receipts
ALTER TABLE Receipts
ADD 
    RejectedBy INT NULL,
    RejectedAt DATETIME NULL,
    ConfirmedBy INT NULL,
    ImportedCompleteNote NVARCHAR(500) NULL,
    RejectionReason NVARCHAR(500) NULL,
    AccountantNotes NVARCHAR(500) NULL,
    BackorderReason NVARCHAR(500) NULL;





--/////////////////////////////////////////////////--
-- WarehouseCards Table
-- Ghi Thẻ Kho: lịch sử nhập
-- TransactionType: 'Import' | 'Export' | 'Transfer' | 'StockTake' | 'Loss'
-- ReferenceType : 'Receipt' | 'IssueSlip' | 'TransferOrder' | 'StockTake' | 'LossReport'

CREATE TABLE [dbo].[WarehouseCards] (
    [CardID]          BIGINT          IDENTITY(1,1) NOT NULL,
    [CardCode]        VARCHAR(50)     NOT NULL,
    [WarehouseID]     INT             NOT NULL,
    [MaterialID]      INT             NOT NULL,
    [BinID]           INT             NOT NULL,
    [BatchID]         INT             NOT NULL,
    [TransactionType] VARCHAR(20)     NOT NULL,
    [ReferenceID]     BIGINT          NOT NULL,
    [ReferenceType]   VARCHAR(20)     NOT NULL,
    [TransactionDate] DATETIME        NOT NULL,
    [Quantity]        DECIMAL(18, 4)  NOT NULL,
    [QuantityBefore]  DECIMAL(18, 4)  NOT NULL,
    [QuantityAfter]   DECIMAL(18, 4)  NOT NULL,
    [CreatedBy]       INT             NOT NULL,
    [Notes]           NVARCHAR(500)   NULL,

    -- Primary Key
    CONSTRAINT [PK_WarehouseCards]
        PRIMARY KEY CLUSTERED ([CardID] ASC),

    -- Unique CardCode
    CONSTRAINT [UQ_WarehouseCards_CardCode]
        UNIQUE ([CardCode]),

    -- FK -> Warehouses
    CONSTRAINT [FK_WarehouseCards_Warehouses]
        FOREIGN KEY ([WarehouseID])
        REFERENCES [dbo].[Warehouses]([WarehouseID]),

    -- FK -> Materials
    CONSTRAINT [FK_WarehouseCards_Materials]
        FOREIGN KEY ([MaterialID])
        REFERENCES [dbo].[Materials]([MaterialID]),

    -- FK -> BinLocations
    CONSTRAINT [FK_WarehouseCards_BinLocations]
        FOREIGN KEY ([BinID])
        REFERENCES [dbo].[BinLocations]([BinID]),

    -- FK -> Batches
    CONSTRAINT [FK_WarehouseCards_Batches]
        FOREIGN KEY ([BatchID])
        REFERENCES [dbo].[Batches]([BatchID]),

    -- FK -> Users
    CONSTRAINT [FK_WarehouseCards_Users]
        FOREIGN KEY ([CreatedBy])
        REFERENCES [dbo].[Users]([UserID])
);


-- Index: tìm kiếm theo vật liệu (dùng nhiều nhất)
CREATE NONCLUSTERED INDEX [IX_WarehouseCards_MaterialID]
    ON [dbo].[WarehouseCards] ([MaterialID]);


-- Index: tìm kiếm theo kho
CREATE NONCLUSTERED INDEX [IX_WarehouseCards_WarehouseID]
    ON [dbo].[WarehouseCards] ([WarehouseID]);


-- Index: tìm kiếm theo ô bin
CREATE NONCLUSTERED INDEX [IX_WarehouseCards_BinID]
    ON [dbo].[WarehouseCards] ([BinID]);


-- Index: lọc theo khoảng thời gian
CREATE NONCLUSTERED INDEX [IX_WarehouseCards_TransactionDate]
    ON [dbo].[WarehouseCards] ([TransactionDate] DESC);


-- Index: tra cứu theo chứng từ gốc (Receipt, IssueSlip,...)
CREATE NONCLUSTERED INDEX [IX_WarehouseCards_ReferenceID_ReferenceType]
    ON [dbo].[WarehouseCards] ([ReferenceID], [ReferenceType]);
GO