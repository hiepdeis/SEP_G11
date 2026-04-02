--/////////////////////////////////////////////////--
-- QCChecks Table
-- Kết quả kiểm tra chất lượng hàng hóa khi xe hàng đến
-- OverallResult: 'Pass' | 'Fail'
--/////////////////////////////////////////////////--

CREATE TABLE [dbo].[QCChecks] (
    [QCCheckID]     BIGINT          IDENTITY(1,1) NOT NULL,
    [QCCheckCode]   VARCHAR(50)     NOT NULL,
    [ReceiptID]     BIGINT          NOT NULL,
    [CheckedBy]     INT             NOT NULL,
    [CheckedAt]     DATETIME        NOT NULL,
    [OverallResult] VARCHAR(10)     NOT NULL,   -- 'Pass' | 'Fail'
    [Notes]         NVARCHAR(1000)  NULL,

    CONSTRAINT [PK_QCChecks]
        PRIMARY KEY CLUSTERED ([QCCheckID] ASC),

    CONSTRAINT [UQ_QCChecks_QCCheckCode]
        UNIQUE ([QCCheckCode]),

    -- Mỗi phiếu nhập chỉ có 1 lần QC check
    CONSTRAINT [UQ_QCChecks_ReceiptID]
        UNIQUE ([ReceiptID]),

    CONSTRAINT [FK_QCChecks_Receipts]
        FOREIGN KEY ([ReceiptID])
        REFERENCES [dbo].[Receipts]([ReceiptID]),

    CONSTRAINT [FK_QCChecks_Users]
        FOREIGN KEY ([CheckedBy])
        REFERENCES [dbo].[Users]([UserID]),

    CONSTRAINT [CK_QCChecks_OverallResult]
        CHECK ([OverallResult] IN ('Pass', 'Fail'))
);
GO

CREATE NONCLUSTERED INDEX [IX_QCChecks_ReceiptID]
    ON [dbo].[QCChecks] ([ReceiptID]);
GO

CREATE NONCLUSTERED INDEX [IX_QCChecks_CheckedAt]
    ON [dbo].[QCChecks] ([CheckedAt] DESC);
GO

--/////////////////////////////////////////////////--
-- QCCheckDetails Table
-- Chi tiết kết quả QC từng dòng vật tư trong phiếu nhập
-- Result: 'Pass' | 'Fail'
--/////////////////////////////////////////////////--

CREATE TABLE [dbo].[QCCheckDetails] (
    [DetailID]          BIGINT          IDENTITY(1,1) NOT NULL,
    [QCCheckID]         BIGINT          NOT NULL,
    [ReceiptDetailID]   BIGINT          NOT NULL,
    [Result]            VARCHAR(10)     NOT NULL,   -- 'Pass' | 'Fail'
    [FailReason]        NVARCHAR(500)   NULL,

    CONSTRAINT [PK_QCCheckDetails]
        PRIMARY KEY CLUSTERED ([DetailID] ASC),

    CONSTRAINT [FK_QCCheckDetails_QCChecks]
        FOREIGN KEY ([QCCheckID])
        REFERENCES [dbo].[QCChecks]([QCCheckID]),

    CONSTRAINT [FK_QCCheckDetails_ReceiptDetails]
        FOREIGN KEY ([ReceiptDetailID])
        REFERENCES [dbo].[ReceiptDetails]([DetailID]),

    CONSTRAINT [CK_QCCheckDetails_Result]
        CHECK ([Result] IN ('Pass', 'Fail'))
);
GO

CREATE NONCLUSTERED INDEX [IX_QCCheckDetails_QCCheckID]
    ON [dbo].[QCCheckDetails] ([QCCheckID]);
GO

CREATE NONCLUSTERED INDEX [IX_QCCheckDetails_ReceiptDetailID]
    ON [dbo].[QCCheckDetails] ([ReceiptDetailID]);
GO