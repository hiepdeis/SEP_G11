
USE [YourDatabaseName];  -- Thay đổi tên database của bạn
GO

SET NOCOUNT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;
    
    PRINT '========================================';
    PRINT 'Starting Schema Update - Stage 4';
    PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
    PRINT '========================================';
    PRINT '';

    -- =============================================
    -- 1. UPDATE Receipts Table
    -- =============================================
    PRINT '1. Updating Receipts table...';
    
    -- Add ParentRequestID column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[Receipts]') 
        AND name = 'ParentRequestID'
    )
    BEGIN
        ALTER TABLE [dbo].[Receipts] 
        ADD [ParentRequestID] BIGINT NULL;
        PRINT '   ✓ Added column: ParentRequestID';
    END
    ELSE
    BEGIN
        PRINT '   - Column ParentRequestID already exists';
    END
    
    -- Add foreign key constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_Receipts_ParentRequest' 
        AND parent_object_id = OBJECT_ID(N'[dbo].[Receipts]')
    )
    BEGIN
        ALTER TABLE [dbo].[Receipts]
        ADD CONSTRAINT [FK_Receipts_ParentRequest] 
        FOREIGN KEY ([ParentRequestID]) 
        REFERENCES [dbo].[Receipts]([ReceiptID]);
        PRINT '   ✓ Added foreign key: FK_Receipts_ParentRequest';
    END
    ELSE
    BEGIN
        PRINT '   - Foreign key FK_Receipts_ParentRequest already exists';
    END
    
    -- Add index if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'IX_Receipts_ParentRequestID' 
        AND object_id = OBJECT_ID(N'[dbo].[Receipts]')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Receipts_ParentRequestID] 
        ON [dbo].[Receipts]([ParentRequestID]);
        PRINT '   ✓ Added index: IX_Receipts_ParentRequestID';
    END
    ELSE
    BEGIN
        PRINT '   - Index IX_Receipts_ParentRequestID already exists';
    END
    
    PRINT '';

    -- =============================================
    -- 2. UPDATE ReceiptDetails Table
    -- =============================================
    PRINT '2. Updating ReceiptDetails table...';
    
    -- Add BinLocationID column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[ReceiptDetails]') 
        AND name = 'BinLocationID'
    )
    BEGIN
        ALTER TABLE [dbo].[ReceiptDetails] 
        ADD [BinLocationID] INT NULL;
        PRINT '   ✓ Added column: BinLocationID';
    END
    ELSE
    BEGIN
        PRINT '   - Column BinLocationID already exists';
    END
    
    -- Add ActualQuantity column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[ReceiptDetails]') 
        AND name = 'ActualQuantity'
    )
    BEGIN
        ALTER TABLE [dbo].[ReceiptDetails] 
        ADD [ActualQuantity] DECIMAL(18, 4) NULL;
        PRINT '   ✓ Added column: ActualQuantity';
    END
    ELSE
    BEGIN
        PRINT '   - Column ActualQuantity already exists';
    END
    
    -- Add foreign key constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_ReceiptDetails_BinLocations' 
        AND parent_object_id = OBJECT_ID(N'[dbo].[ReceiptDetails]')
    )
    BEGIN
        ALTER TABLE [dbo].[ReceiptDetails]
        ADD CONSTRAINT [FK_ReceiptDetails_BinLocations] 
        FOREIGN KEY ([BinLocationID]) 
        REFERENCES [dbo].[BinLocations]([BinID]);
        PRINT '   ✓ Added foreign key: FK_ReceiptDetails_BinLocations';
    END
    ELSE
    BEGIN
        PRINT '   - Foreign key FK_ReceiptDetails_BinLocations already exists';
    END
    
    -- Add index if not exists
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'IX_ReceiptDetails_BinLocationID' 
        AND object_id = OBJECT_ID(N'[dbo].[ReceiptDetails]')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ReceiptDetails_BinLocationID] 
        ON [dbo].[ReceiptDetails]([BinLocationID]);
        PRINT '   ✓ Added index: IX_ReceiptDetails_BinLocationID';
    END
    ELSE
    BEGIN
        PRINT '   - Index IX_ReceiptDetails_BinLocationID already exists';
    END
    
    PRINT '';