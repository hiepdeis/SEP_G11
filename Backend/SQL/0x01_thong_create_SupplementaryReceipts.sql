-- Create SupplementaryReceipts table
CREATE TABLE [dbo].[SupplementaryReceipts] (
    [SupplementaryReceiptID] BIGINT IDENTITY(1,1) NOT NULL,
    [PurchaseOrderID] BIGINT NOT NULL,
    [IncidentID] BIGINT NOT NULL,
    [Status] VARCHAR(30) NOT NULL DEFAULT ('PendingManagerApproval'),
    [SupplierNote] NVARCHAR(1000) NULL,
    [ExpectedDeliveryDate] DATETIME NULL,
    [CreatedByPurchasingId] INT NOT NULL,
    [CreatedAt] DATETIME NOT NULL,
    [ApprovedByManagerId] INT NULL,
    [ApprovedAt] DATETIME NULL,

    CONSTRAINT [PK_SupplementaryReceipts]
        PRIMARY KEY CLUSTERED ([SupplementaryReceiptID] ASC),

    CONSTRAINT [FK_SupplementaryReceipts_PurchaseOrders]
        FOREIGN KEY ([PurchaseOrderID])
        REFERENCES [dbo].[PurchaseOrders]([PurchaseOrderID]),

    CONSTRAINT [FK_SupplementaryReceipts_IncidentReports]
        FOREIGN KEY ([IncidentID])
        REFERENCES [dbo].[IncidentReports]([IncidentID])
);
GO

CREATE NONCLUSTERED INDEX [IX_SupplementaryReceipts_PurchaseOrderID]
    ON [dbo].[SupplementaryReceipts] ([PurchaseOrderID]);
GO

CREATE NONCLUSTERED INDEX [IX_SupplementaryReceipts_IncidentID]
    ON [dbo].[SupplementaryReceipts] ([IncidentID]);
GO
