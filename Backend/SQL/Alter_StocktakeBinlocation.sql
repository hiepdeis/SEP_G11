/*
================================================================================
SEP_G11 DATABASE UPDATE SCRIPT
Mục đích: Thêm Audit/Stocktaking Module Schema
Database: sep_g11
CreateDate: 2026-02-26
================================================================================
*/

SET XACT_ABORT ON;
BEGIN TRAN;

PRINT '========== Starting Database Update ==========';

-- ============================================================================
-- 1) UPDATE dbo.StockTakes  (Audit header)
-- ============================================================================
PRINT 'Step 1: Updating dbo.StockTakes...';

IF COL_LENGTH('dbo.StockTakes', 'Title') IS NULL
    ALTER TABLE dbo.StockTakes ADD Title NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.StockTakes', 'PlannedStartDate') IS NULL
    ALTER TABLE dbo.StockTakes ADD PlannedStartDate DATETIME2(0) NULL;

IF COL_LENGTH('dbo.StockTakes', 'PlannedEndDate') IS NULL
    ALTER TABLE dbo.StockTakes ADD PlannedEndDate DATETIME2(0) NULL;

IF COL_LENGTH('dbo.StockTakes', 'CreatedAt') IS NULL
    ALTER TABLE dbo.StockTakes
    ADD CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_StockTakes_CreatedAt DEFAULT (SYSDATETIME());

IF COL_LENGTH('dbo.StockTakes', 'LockedAt') IS NULL
    ALTER TABLE dbo.StockTakes ADD LockedAt DATETIME2(0) NULL;

IF COL_LENGTH('dbo.StockTakes', 'LockedBy') IS NULL
    ALTER TABLE dbo.StockTakes ADD LockedBy INT NULL;

IF COL_LENGTH('dbo.StockTakes', 'CompletedAt') IS NULL
    ALTER TABLE dbo.StockTakes ADD CompletedAt DATETIME2(0) NULL;

IF COL_LENGTH('dbo.StockTakes', 'CompletedBy') IS NULL
    ALTER TABLE dbo.StockTakes ADD CompletedBy INT NULL;

IF COL_LENGTH('dbo.StockTakes', 'Notes') IS NULL
    ALTER TABLE dbo.StockTakes ADD Notes NVARCHAR(500) NULL;

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakes_LockedBy_Users')
        ALTER TABLE dbo.StockTakes
        ADD CONSTRAINT FK_StockTakes_LockedBy_Users
        FOREIGN KEY (LockedBy) REFERENCES dbo.Users(UserID);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakes_CompletedBy_Users')
        ALTER TABLE dbo.StockTakes
        ADD CONSTRAINT FK_StockTakes_CompletedBy_Users
        FOREIGN KEY (CompletedBy) REFERENCES dbo.Users(UserID);
END

PRINT '✓ StockTakes updated';

-- ============================================================================
-- 2) CREATE dbo.StockTakeBinLocations (Junction Table - NEW)
-- ============================================================================
PRINT 'Step 2: Creating dbo.StockTakeBinLocations...';

IF OBJECT_ID('dbo.StockTakeBinLocations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockTakeBinLocations
    (
        StockTakeBinLocationID INT PRIMARY KEY IDENTITY(1,1),
        StockTakeID INT NOT NULL,
        BinID INT NOT NULL,
        CONSTRAINT FK_StockTakeBinLocations_StockTakes
            FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID) ON DELETE CASCADE,
        CONSTRAINT FK_StockTakeBinLocations_BinLocations
            FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID) ON DELETE CASCADE,
        CONSTRAINT UQ_StockTakeBinLocations_Unique
            UNIQUE (StockTakeID, BinID)
    );
    
    CREATE INDEX IX_StockTakeBinLocations_StockTakeID ON dbo.StockTakeBinLocations(StockTakeID);
    CREATE INDEX IX_StockTakeBinLocations_BinID ON dbo.StockTakeBinLocations(BinID);
    
    PRINT '✓ StockTakeBinLocations created';
END
ELSE
BEGIN
    PRINT '✓ StockTakeBinLocations already exists';
END

-- ============================================================================
-- 3) UPDATE dbo.StockTakeDetails (Audit line items)
-- ============================================================================
PRINT 'Step 3: Updating dbo.StockTakeDetails...';

IF COL_LENGTH('dbo.StockTakeDetails', 'BinID') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD BinID INT NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'CountedBy') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD CountedBy INT NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'CountedAt') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD CountedAt DATETIME2(0) NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'DiscrepancyStatus') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD DiscrepancyStatus VARCHAR(20) NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'ResolutionAction') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD ResolutionAction VARCHAR(20) NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'AdjustmentReasonID') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD AdjustmentReasonID INT NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'ResolvedBy') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD ResolvedBy INT NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'ResolvedAt') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD ResolvedAt DATETIME2(0) NULL;

IF OBJECT_ID('dbo.BinLocations', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_BinLocations')
        ALTER TABLE dbo.StockTakeDetails
        ADD CONSTRAINT FK_StockTakeDetails_BinLocations
        FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID);
END

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_CountedBy_Users')
        ALTER TABLE dbo.StockTakeDetails
        ADD CONSTRAINT FK_StockTakeDetails_CountedBy_Users
        FOREIGN KEY (CountedBy) REFERENCES dbo.Users(UserID);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_ResolvedBy_Users')
        ALTER TABLE dbo.StockTakeDetails
        ADD CONSTRAINT FK_StockTakeDetails_ResolvedBy_Users
        FOREIGN KEY (ResolvedBy) REFERENCES dbo.Users(UserID);
END

PRINT '✓ StockTakeDetails updated';

-- ============================================================================
-- 4) CREATE dbo.AdjustmentReasons
-- ============================================================================
PRINT 'Step 4: Creating dbo.AdjustmentReasons...';

IF OBJECT_ID('dbo.AdjustmentReasons', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdjustmentReasons
    (
        ReasonID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Code VARCHAR(50) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_AdjustmentReasons_IsActive DEFAULT (1)
    );
    CREATE UNIQUE INDEX UX_AdjustmentReasons_Code ON dbo.AdjustmentReasons(Code);
    PRINT '✓ AdjustmentReasons created';
END
ELSE
    PRINT '✓ AdjustmentReasons already exists';

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_AdjustmentReasons')
BEGIN
    ALTER TABLE dbo.StockTakeDetails
    ADD CONSTRAINT FK_StockTakeDetails_AdjustmentReasons
    FOREIGN KEY (AdjustmentReasonID) REFERENCES dbo.AdjustmentReasons(ReasonID);
END

-- ============================================================================
-- 5) CREATE dbo.StockTakeTeamMembers
-- ============================================================================
PRINT 'Step 5: Creating dbo.StockTakeTeamMembers...';

IF OBJECT_ID('dbo.StockTakeTeamMembers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockTakeTeamMembers
    (
        ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StockTakeID INT NOT NULL,
        UserID INT NOT NULL,
        RoleInTeam VARCHAR(30) NULL,
        AssignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StockTakeTeamMembers_AssignedAt DEFAULT (SYSDATETIME()),
        RemovedAt DATETIME2(0) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_StockTakeTeamMembers_IsActive DEFAULT (1)
    );

    CREATE INDEX IX_StockTakeTeamMembers_StockTakeID ON dbo.StockTakeTeamMembers(StockTakeID);
    CREATE INDEX IX_StockTakeTeamMembers_UserID ON dbo.StockTakeTeamMembers(UserID);
    CREATE UNIQUE INDEX UX_StockTakeTeamMembers_StockTake_User ON dbo.StockTakeTeamMembers(StockTakeID, UserID);

    ALTER TABLE dbo.StockTakeTeamMembers
    ADD CONSTRAINT FK_StockTakeTeamMembers_StockTakes
    FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.StockTakeTeamMembers
        ADD CONSTRAINT FK_StockTakeTeamMembers_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID);
    END
    PRINT '✓ StockTakeTeamMembers created';
END
ELSE
    PRINT '✓ StockTakeTeamMembers already exists';

-- ============================================================================
-- 6) CREATE dbo.StockTakeSignatures
-- ============================================================================
PRINT 'Step 6: Creating dbo.StockTakeSignatures...';

IF OBJECT_ID('dbo.StockTakeSignatures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockTakeSignatures
    (
        SignatureID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StockTakeID INT NOT NULL,
        UserID INT NOT NULL,
        Role VARCHAR(20) NOT NULL,
        SignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StockTakeSignatures_SignedAt DEFAULT (SYSDATETIME()),
        SignatureData NVARCHAR(MAX) NULL
    );

    CREATE INDEX IX_StockTakeSignatures_StockTakeID ON dbo.StockTakeSignatures(StockTakeID);
    CREATE INDEX IX_StockTakeSignatures_UserID ON dbo.StockTakeSignatures(UserID);
    CREATE UNIQUE INDEX UX_StockTakeSignatures_StockTake_Role ON dbo.StockTakeSignatures(StockTakeID, Role);

    ALTER TABLE dbo.StockTakeSignatures
    ADD CONSTRAINT FK_StockTakeSignatures_StockTakes
    FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.StockTakeSignatures
        ADD CONSTRAINT FK_StockTakeSignatures_Users
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID);
    END
    PRINT '✓ StockTakeSignatures created';
END
ELSE
    PRINT '✓ StockTakeSignatures already exists';

-- ============================================================================
-- 7) CREATE dbo.InventoryAdjustmentEntries
-- ============================================================================
PRINT 'Step 7: Creating dbo.InventoryAdjustmentEntries...';

IF OBJECT_ID('dbo.InventoryAdjustmentEntries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InventoryAdjustmentEntries
    (
        EntryID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StockTakeID INT NOT NULL,
        StockTakeDetailID BIGINT NOT NULL,
        WarehouseID INT NULL,
        BinID INT NULL,
        MaterialID INT NULL,
        BatchID INT NULL,
        QtyDelta DECIMAL(18,4) NOT NULL,
        ReasonID INT NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_InvAdjEntries_Status DEFAULT ('Draft'),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_InvAdjEntries_CreatedAt DEFAULT (SYSDATETIME()),
        CreatedBy INT NULL,
        ApprovedAt DATETIME2(0) NULL,
        ApprovedBy INT NULL,
        PostedAt DATETIME2(0) NULL
    );

    CREATE INDEX IX_InvAdjEntries_StockTakeID ON dbo.InventoryAdjustmentEntries(StockTakeID);
    CREATE INDEX IX_InvAdjEntries_StockTakeDetailID ON dbo.InventoryAdjustmentEntries(StockTakeDetailID);

    ALTER TABLE dbo.InventoryAdjustmentEntries
    ADD CONSTRAINT FK_InvAdjEntries_StockTakes
    FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    ALTER TABLE dbo.InventoryAdjustmentEntries
    ADD CONSTRAINT FK_InvAdjEntries_StockTakeDetails
    FOREIGN KEY (StockTakeDetailID) REFERENCES dbo.StockTakeDetails(ID);

    ALTER TABLE dbo.InventoryAdjustmentEntries
    ADD CONSTRAINT FK_InvAdjEntries_AdjustmentReasons
    FOREIGN KEY (ReasonID) REFERENCES dbo.AdjustmentReasons(ReasonID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_CreatedBy_Users
        FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID);

        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_ApprovedBy_Users
        FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserID);
    END

    IF OBJECT_ID('dbo.Warehouses', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_Warehouses
        FOREIGN KEY (WarehouseID) REFERENCES dbo.Warehouses(WarehouseID);
    END

    IF OBJECT_ID('dbo.BinLocations', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_BinLocations
        FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID);
    END

    IF OBJECT_ID('dbo.Materials', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_Materials
        FOREIGN KEY (MaterialID) REFERENCES dbo.Materials(MaterialID);
    END

    IF OBJECT_ID('dbo.Batches', 'U') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_Batches
        FOREIGN KEY (BatchID) REFERENCES dbo.Batches(BatchID);
    END
    
    PRINT '✓ InventoryAdjustmentEntries created';
END
ELSE
    PRINT '✓ InventoryAdjustmentEntries already exists';

COMMIT TRAN;
PRINT '';
PRINT '========== Database Update Completed Successfully! ==========';
PRINT 'All tables and constraints have been created/updated.';