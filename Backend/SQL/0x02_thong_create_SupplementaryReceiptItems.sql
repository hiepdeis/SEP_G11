-- Create SupplementaryReceiptItems table
CREATE TABLE [dbo].[SupplementaryReceiptItems] (
    [ItemID] BIGINT IDENTITY(1,1) NOT NULL,
    [SupplementaryReceiptID] BIGINT NOT NULL,
    [MaterialID] INT NOT NULL,
    [SupplementaryQuantity] DECIMAL(18, 4) NOT NULL,

    CONSTRAINT [PK_SupplementaryReceiptItems]
        PRIMARY KEY CLUSTERED ([ItemID] ASC),

    CONSTRAINT [FK_SupplementaryReceiptItems_SupplementaryReceipts]
        FOREIGN KEY ([SupplementaryReceiptID])
        REFERENCES [dbo].[SupplementaryReceipts]([SupplementaryReceiptID]),

    CONSTRAINT [FK_SupplementaryReceiptItems_Materials]
        FOREIGN KEY ([MaterialID])
        REFERENCES [dbo].[Materials]([MaterialID])
);
GO

CREATE NONCLUSTERED INDEX [IX_SupplementaryReceiptItems_SupplementaryReceiptID]
    ON [dbo].[SupplementaryReceiptItems] ([SupplementaryReceiptID]);
GO

CREATE NONCLUSTERED INDEX [IX_SupplementaryReceiptItems_MaterialID]
    ON [dbo].[SupplementaryReceiptItems] ([MaterialID]);
GO
