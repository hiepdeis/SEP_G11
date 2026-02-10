USE [sep_g11];
GO

/* ==================================================
   A) UPDATE dbo.StockTakes  (cập nhật thêm cột mới)
   ================================================== */

IF COL_LENGTH('dbo.StockTakes', 'Title') IS NULL
    ALTER TABLE dbo.StockTakes ADD Title nvarchar(255) NULL;

IF COL_LENGTH('dbo.StockTakes', 'CreatedAt') IS NULL
    ALTER TABLE dbo.StockTakes ADD CreatedAt datetime2(7) NULL;

-- Add FK Users for LockedBy / ApprovedBy / CompletedBy (nếu chưa có FK này theo đúng tên)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakes_LockedBy_Users')
BEGIN
    ALTER TABLE dbo.StockTakes WITH CHECK
    ADD CONSTRAINT FK_StockTakes_LockedBy_Users
    FOREIGN KEY (LockedBy) REFERENCES dbo.Users(UserID);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakes_ApprovedBy_Users')
BEGIN
    ALTER TABLE dbo.StockTakes WITH CHECK
    ADD CONSTRAINT FK_StockTakes_ApprovedBy_Users
    FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserID);
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakes_CompletedBy_Users')
BEGIN
    ALTER TABLE dbo.StockTakes WITH CHECK
    ADD CONSTRAINT FK_StockTakes_CompletedBy_Users
    FOREIGN KEY (CompletedBy) REFERENCES dbo.Users(UserID);
END
GO


/* ==========================================================
   B) UPDATE dbo.StockTakeDetails (cập nhật thêm cột mới)
   ========================================================== */

IF COL_LENGTH('dbo.StockTakeDetails', 'BinID') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD BinID int NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'ReasonCode') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD ReasonCode nvarchar(50) NULL;

IF COL_LENGTH('dbo.StockTakeDetails', 'ReasonNote') IS NULL
    ALTER TABLE dbo.StockTakeDetails ADD ReasonNote nvarchar(500) NULL;

-- Nếu bảng cũ có cột Reason thì copy qua ReasonNote
IF COL_LENGTH('dbo.StockTakeDetails', 'Reason') IS NOT NULL
BEGIN
    UPDATE d
    SET d.ReasonNote = COALESCE(d.ReasonNote, d.Reason)
    FROM dbo.StockTakeDetails d;
END

-- FK BinLocations nếu bạn có bảng BinLocations
IF OBJECT_ID('dbo.BinLocations', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_StockTakeDetails_BinLocations')
    BEGIN
        ALTER TABLE dbo.StockTakeDetails WITH CHECK
        ADD CONSTRAINT FK_StockTakeDetails_BinLocations
        FOREIGN KEY (BinID) REFERENCES dbo.BinLocations(BinID);
    END
END
GO


/* ==================================================
   C) NEW dbo.StockTakeTeamMembers (thêm mới bảng)
   ================================================== */

IF OBJECT_ID('dbo.StockTakeTeamMembers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockTakeTeamMembers
    (
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StockTakeTeamMembers PRIMARY KEY,
        StockTakeId int NOT NULL,
        UserId int NOT NULL,

        RoleInAudit nvarchar(50) NULL,
        AssignedBy int NULL,
        AssignedAt datetime2(7) NULL,

        Status nvarchar(30) NULL,
        Note nvarchar(500) NULL
    );

    ALTER TABLE dbo.StockTakeTeamMembers WITH CHECK
    ADD CONSTRAINT FK_StockTakeTeamMembers_StockTakes
    FOREIGN KEY (StockTakeId) REFERENCES dbo.StockTakes(StockTakeID);

    ALTER TABLE dbo.StockTakeTeamMembers WITH CHECK
    ADD CONSTRAINT FK_StockTakeTeamMembers_Users
    FOREIGN KEY (UserId) REFERENCES dbo.Users(UserID);

    ALTER TABLE dbo.StockTakeTeamMembers WITH CHECK
    ADD CONSTRAINT FK_StockTakeTeamMembers_AssignedBy_Users
    FOREIGN KEY (AssignedBy) REFERENCES dbo.Users(UserID);

    -- Không cho assign trùng 1 user vào 1 stocktake
    CREATE UNIQUE NONCLUSTERED INDEX UX_StockTakeTeamMembers_StockTake_User
    ON dbo.StockTakeTeamMembers(StockTakeId, UserId);

    CREATE NONCLUSTERED INDEX IX_StockTakeTeamMembers_StockTakeId
    ON dbo.StockTakeTeamMembers(StockTakeId);
END
GO
