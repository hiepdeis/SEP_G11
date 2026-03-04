

/*
================================================================================
I. Ý NGHĨA & VAI TRÒ TỪNG BẢNG (dùng trong luồng Audit/Stocktaking)
================================================================================

1) dbo.StockTakes  (Header / Audit Session)
   - 1 record = 1 đợt kiểm kê.
   - Dùng ở màn: Create Audit Plan, Lock System, Complete.
   - Bổ sung các cột:
       Title, PlannedStartDate, PlannedEndDate, CreatedAt,
       LockedAt/LockedBy, CompletedAt/CompletedBy, Notes.

2) dbo.StockTakeDetails (Line Items / Counting & Reconcile)
   - 1 record = 1 dòng kiểm kê (Material + Batch, thêm Bin nếu cần).
   - Dùng ở màn: Manual Inventory Count, Reconcile.
   - Bổ sung các cột:
       BinID, CountedBy/CountedAt,
       DiscrepancyStatus, ResolutionAction,
       AdjustmentReasonID,
       ResolvedBy/ResolvedAt.

3) dbo.StockTakeTeamMembers (Assign Team)
   - Bảng trung gian StockTakes <-> Users (ai tham gia audit).
   - Dùng ở màn: Assign Team.

4) dbo.StockTakeSignatures (Digital Signature)
   - Chữ ký xác nhận (Staff/Manager) cho 1 đợt kiểm kê.
   - Dùng ở màn: Sign/Approve.

5) dbo.AdjustmentReasons (Master data)
   - Danh mục lý do điều chỉnh (dropdown).

6) dbo.InventoryAdjustmentEntries (Adjustment Queue / Posting)
   - Queue bút toán điều chỉnh tồn kho sinh ra từ reconcile.
   - Dùng ở màn: Confirm Adjustment.
   - Có trạng thái Draft/Approved/Posted, người duyệt, thời điểm post.

================================================================================
II. CHẠY SCRIPT
================================================================================
- Chạy trên SSMS vào DB sep_g11.
- Nếu schema khác DOAN.sql (ví dụ tên PK), bạn cần sửa phần REFERENCES.
*/

SET XACT_ABORT ON;
BEGIN TRAN;

--------------------------------------------------------------------------------
-- 0) Validate core tables exist (theo DOAN.sql)
--------------------------------------------------------------------------------
IF OBJECT_ID('dbo.StockTakes', 'U') IS NULL
BEGIN
    RAISERROR('Missing table dbo.StockTakes (DOAN.sql uses StockTakes).', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END

IF OBJECT_ID('dbo.StockTakeDetails', 'U') IS NULL
BEGIN
    RAISERROR('Missing table dbo.StockTakeDetails (DOAN.sql uses StockTakeDetails).', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END

--------------------------------------------------------------------------------
-- 1) UPDATE dbo.StockTakes  (Audit header)
--------------------------------------------------------------------------------
PRINT 'Updating dbo.StockTakes...';

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

-- FK to Users(UserID) if exists
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
ELSE
BEGIN
    PRINT 'WARN: dbo.Users not found -> skipping FK for LockedBy/CompletedBy';
END

--------------------------------------------------------------------------------
-- 1.5) CREATE dbo.StockTakeBinLocations (Junction Table)
--------------------------------------------------------------------------------
PRINT 'Creating dbo.StockTakeBinLocations...';

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
    
    PRINT 'dbo.StockTakeBinLocations created successfully';
END
ELSE
BEGIN
    PRINT 'dbo.StockTakeBinLocations already exists';
END

--------------------------------------------------------------------------------
-- 2) UPDATE dbo.StockTakeDetails (Audit line)
--------------------------------------------------------------------------------
PRINT 'Updating dbo.StockTakeDetails...';

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

-- FK to BinLocations(BinID) if exists
IF OBJECT_ID('dbo.BinLocations', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_BinLocations')
        ALTER TABLE dbo.StockTakeDetails
        ADD CONSTRAINT FK_StockTakeDetails_BinLocations
        FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID);
END
ELSE
BEGIN
    PRINT 'WARN: dbo.BinLocations not found -> skipping FK for StockTakeDetails.BinID';
END

-- FK to Users(UserID) if exists
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
ELSE
BEGIN
    PRINT 'WARN: dbo.Users not found -> skipping FK for CountedBy/ResolvedBy';
END

--------------------------------------------------------------------------------
-- 3) CREATE dbo.AdjustmentReasons (lookup)
--------------------------------------------------------------------------------
PRINT 'Creating dbo.AdjustmentReasons (if missing)...';

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
END;

-- FK StockTakeDetails -> AdjustmentReasons
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_AdjustmentReasons')
BEGIN
    ALTER TABLE dbo.StockTakeDetails
    ADD CONSTRAINT FK_StockTakeDetails_AdjustmentReasons
    FOREIGN KEY (AdjustmentReasonID) REFERENCES dbo.AdjustmentReasons(ReasonID);
END;

--------------------------------------------------------------------------------
-- 4) CREATE dbo.StockTakeTeamMembers (assign team)
--------------------------------------------------------------------------------
PRINT 'Creating dbo.StockTakeTeamMembers (if missing)...';

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

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeTeamMembers_StockTakes')
        ALTER TABLE dbo.StockTakeTeamMembers
        ADD CONSTRAINT FK_StockTakeTeamMembers_StockTakes
        FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeTeamMembers_Users')
            ALTER TABLE dbo.StockTakeTeamMembers
            ADD CONSTRAINT FK_StockTakeTeamMembers_Users
            FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID);
    END
END;

--------------------------------------------------------------------------------
-- 5) CREATE dbo.StockTakeSignatures (sign/approve)
--------------------------------------------------------------------------------
PRINT 'Creating dbo.StockTakeSignatures (if missing)...';

IF OBJECT_ID('dbo.StockTakeSignatures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockTakeSignatures
    (
        SignatureID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StockTakeID INT NOT NULL,
        UserID INT NOT NULL,
        Role VARCHAR(20) NOT NULL,      -- Staff/Manager
        SignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StockTakeSignatures_SignedAt DEFAULT (SYSDATETIME()),
        SignatureData NVARCHAR(MAX) NULL
    );

    CREATE INDEX IX_StockTakeSignatures_StockTakeID ON dbo.StockTakeSignatures(StockTakeID);
    CREATE INDEX IX_StockTakeSignatures_UserID ON dbo.StockTakeSignatures(UserID);
    CREATE UNIQUE INDEX UX_StockTakeSignatures_StockTake_Role ON dbo.StockTakeSignatures(StockTakeID, Role);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeSignatures_StockTakes')
        ALTER TABLE dbo.StockTakeSignatures
        ADD CONSTRAINT FK_StockTakeSignatures_StockTakes
        FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeSignatures_Users')
            ALTER TABLE dbo.StockTakeSignatures
            ADD CONSTRAINT FK_StockTakeSignatures_Users
            FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID);
    END
END;

--------------------------------------------------------------------------------
-- 6) CREATE dbo.InventoryAdjustmentEntries (confirm adjustment / posting queue)
--------------------------------------------------------------------------------
PRINT 'Creating dbo.InventoryAdjustmentEntries (if missing)...';

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

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_StockTakes')
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_StockTakes
        FOREIGN KEY (StockTakeID) REFERENCES dbo.StockTakes(StockTakeID);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_StockTakeDetails')
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_StockTakeDetails
        FOREIGN KEY (StockTakeDetailID) REFERENCES dbo.StockTakeDetails(ID);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_AdjustmentReasons')
        ALTER TABLE dbo.InventoryAdjustmentEntries
        ADD CONSTRAINT FK_InvAdjEntries_AdjustmentReasons
        FOREIGN KEY (ReasonID) REFERENCES dbo.AdjustmentReasons(ReasonID);

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_CreatedBy_Users')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_CreatedBy_Users
            FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID);

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_ApprovedBy_Users')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_ApprovedBy_Users
            FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserID);
    END

    IF OBJECT_ID('dbo.Warehouses', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_Warehouses')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_Warehouses
            FOREIGN KEY (WarehouseID) REFERENCES dbo.Warehouses(WarehouseID);
    END

    IF OBJECT_ID('dbo.BinLocations', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_BinLocations')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_BinLocations
            FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID);
    END

    IF OBJECT_ID('dbo.Materials', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_Materials')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_Materials
            FOREIGN KEY (MaterialID) REFERENCES dbo.Materials(MaterialID);
    END

    IF OBJECT_ID('dbo.Batches', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvAdjEntries_Batches')
            ALTER TABLE dbo.InventoryAdjustmentEntries
            ADD CONSTRAINT FK_InvAdjEntries_Batches
            FOREIGN KEY (BatchID) REFERENCES dbo.Batches(BatchID);
    END
END;

COMMIT TRAN;
PRINT 'DONE: Audit/Stocktaking schema update completed successfully.';
