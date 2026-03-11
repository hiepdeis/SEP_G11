--/////////////////////////////////////////////////--
-- IncidentReports Table
-- Biên bản bất thường khi tiếp nhận hàng (QC fail hoặc sự cố khác)
-- Status: 'Open' | 'Resolved'
-- Liên kết với Receipt và QCCheck (nullable)
--/////////////////////////////////////////////////--

CREATE TABLE [dbo].[IncidentReports] (
    [IncidentID]    BIGINT          IDENTITY(1,1) NOT NULL,
    [IncidentCode]  VARCHAR(50)     NOT NULL,
    [ReceiptID]     BIGINT          NOT NULL,
    [QCCheckID]     BIGINT          NULL,           -- nullable: có thể lập độc lập không cần QC
    [CreatedBy]     INT             NOT NULL,
    [CreatedAt]     DATETIME        NOT NULL,
    [Description]   NVARCHAR(2000)  NOT NULL,
    [Status]        VARCHAR(20)     NOT NULL DEFAULT 'Open',
    [Resolution]    NVARCHAR(2000)  NULL,
    [ResolvedAt]    DATETIME        NULL,
    [ResolvedBy]    INT             NULL,

    CONSTRAINT [PK_IncidentReports]
        PRIMARY KEY CLUSTERED ([IncidentID] ASC),

    CONSTRAINT [UQ_IncidentReports_IncidentCode]
        UNIQUE ([IncidentCode]),

    -- Mỗi phiếu nhập chỉ có 1 biên bản
    CONSTRAINT [UQ_IncidentReports_ReceiptID]
        UNIQUE ([ReceiptID]),

    CONSTRAINT [FK_IncidentReports_Receipts]
        FOREIGN KEY ([ReceiptID])
        REFERENCES [dbo].[Receipts]([ReceiptID]),

    CONSTRAINT [FK_IncidentReports_QCChecks]
        FOREIGN KEY ([QCCheckID])
        REFERENCES [dbo].[QCChecks]([QCCheckID]),

    CONSTRAINT [FK_IncidentReports_Users_CreatedBy]
        FOREIGN KEY ([CreatedBy])
        REFERENCES [dbo].[Users]([UserID]),

    CONSTRAINT [FK_IncidentReports_Users_ResolvedBy]
        FOREIGN KEY ([ResolvedBy])
        REFERENCES [dbo].[Users]([UserID]),

    CONSTRAINT [CK_IncidentReports_Status]
        CHECK ([Status] IN ('Open', 'Resolved'))
);
GO

CREATE NONCLUSTERED INDEX [IX_IncidentReports_ReceiptID]
    ON [dbo].[IncidentReports] ([ReceiptID]);
GO

CREATE NONCLUSTERED INDEX [IX_IncidentReports_Status]
    ON [dbo].[IncidentReports] ([Status]);
GO

CREATE NONCLUSTERED INDEX [IX_IncidentReports_CreatedAt]
    ON [dbo].[IncidentReports] ([CreatedAt] DESC);
GO

--/////////////////////////////////////////////////--
-- IncidentReportDetails Table
-- Chi tiết từng dòng vật tư trong biên bản bất thường
-- IssueType: 'Quantity' | 'Quality' | 'Damage'
--/////////////////////////////////////////////////--

CREATE TABLE [dbo].[IncidentReportDetails] (
    [DetailID]          BIGINT          IDENTITY(1,1) NOT NULL,
    [IncidentID]        BIGINT          NOT NULL,
    [ReceiptDetailID]   BIGINT          NOT NULL,
    [MaterialID]        INT             NOT NULL,
    [ExpectedQuantity]  DECIMAL(18, 4)  NOT NULL,
    [ActualQuantity]    DECIMAL(18, 4)  NOT NULL,
    [IssueType]         VARCHAR(20)     NOT NULL,
    [Notes]             NVARCHAR(1000)  NULL,

    CONSTRAINT [PK_IncidentReportDetails]
        PRIMARY KEY CLUSTERED ([DetailID] ASC),

    CONSTRAINT [FK_IncidentReportDetails_IncidentReports]
        FOREIGN KEY ([IncidentID])
        REFERENCES [dbo].[IncidentReports]([IncidentID]),

    CONSTRAINT [FK_IncidentReportDetails_ReceiptDetails]
        FOREIGN KEY ([ReceiptDetailID])
        REFERENCES [dbo].[ReceiptDetails]([DetailID]),

    CONSTRAINT [FK_IncidentReportDetails_Materials]
        FOREIGN KEY ([MaterialID])
        REFERENCES [dbo].[Materials]([MaterialID]),

    CONSTRAINT [CK_IncidentReportDetails_IssueType]
        CHECK ([IssueType] IN ('Quantity', 'Quality', 'Damage'))
);
GO

CREATE NONCLUSTERED INDEX [IX_IncidentReportDetails_IncidentID]
    ON [dbo].[IncidentReportDetails] ([IncidentID]);
GO

CREATE NONCLUSTERED INDEX [IX_IncidentReportDetails_ReceiptDetailID]
    ON [dbo].[IncidentReportDetails] ([ReceiptDetailID]);
GO
