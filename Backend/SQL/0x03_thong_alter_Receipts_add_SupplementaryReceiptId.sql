-- Add SupplementaryReceiptID to Receipts
ALTER TABLE [dbo].[Receipts]
ADD [SupplementaryReceiptID] BIGINT NULL;
GO

ALTER TABLE [dbo].[Receipts]
ADD CONSTRAINT [FK_Receipts_SupplementaryReceipts]
    FOREIGN KEY ([SupplementaryReceiptID])
    REFERENCES [dbo].[SupplementaryReceipts]([SupplementaryReceiptID]);
GO

CREATE NONCLUSTERED INDEX [IX_Receipts_SupplementaryReceiptID]
    ON [dbo].[Receipts] ([SupplementaryReceiptID]);
GO
