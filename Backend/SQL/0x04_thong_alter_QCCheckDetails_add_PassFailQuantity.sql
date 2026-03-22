-- Add pass/fail quantity fields to QCCheckDetails
ALTER TABLE [dbo].[QCCheckDetails]
ADD [PassQuantity] DECIMAL(18, 4) NOT NULL CONSTRAINT [DF_QCCheckDetails_PassQuantity] DEFAULT (0);
GO

ALTER TABLE [dbo].[QCCheckDetails]
ADD [FailQuantity] DECIMAL(18, 4) NOT NULL CONSTRAINT [DF_QCCheckDetails_FailQuantity] DEFAULT (0);
GO
