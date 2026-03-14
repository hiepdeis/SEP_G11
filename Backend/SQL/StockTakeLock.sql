SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRAN;

    PRINT '=== Step 1: Create dbo.StockTakeLocks if not exists ===';

    IF OBJECT_ID('dbo.StockTakeLocks', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.StockTakeLocks (
            LockId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            StockTakeId INT NOT NULL,
            ScopeType VARCHAR(20) NOT NULL,      -- Warehouse | Bin
            WarehouseId INT NOT NULL,
            BinId INT NULL,
            IsActive BIT NOT NULL
                CONSTRAINT DF_StockTakeLocks_IsActive DEFAULT (1),
            LockedAt DATETIME2(0) NOT NULL
                CONSTRAINT DF_StockTakeLocks_LockedAt DEFAULT SYSUTCDATETIME(),
            LockedBy INT NULL,
            UnlockedAt DATETIME2(0) NULL,
            UnlockedBy INT NULL,

            CONSTRAINT FK_StockTakeLocks_StockTakes
                FOREIGN KEY (StockTakeId) REFERENCES dbo.StockTakes(StockTakeID),

            CONSTRAINT FK_StockTakeLocks_Warehouses
                FOREIGN KEY (WarehouseId) REFERENCES dbo.Warehouses(WarehouseID),

            CONSTRAINT FK_StockTakeLocks_BinLocations
                FOREIGN KEY (BinId) REFERENCES dbo.BinLocations(BinID),

            CONSTRAINT FK_StockTakeLocks_LockedBy_Users
                FOREIGN KEY (LockedBy) REFERENCES dbo.Users(UserID),

            CONSTRAINT FK_StockTakeLocks_UnlockedBy_Users
                FOREIGN KEY (UnlockedBy) REFERENCES dbo.Users(UserID),

            CONSTRAINT CK_StockTakeLocks_ScopeType
                CHECK (ScopeType IN ('Warehouse', 'Bin')),

            CONSTRAINT CK_StockTakeLocks_BinRequired
                CHECK (
                    (ScopeType = 'Warehouse' AND BinId IS NULL)
                    OR
                    (ScopeType = 'Bin' AND BinId IS NOT NULL)
                )
        );
    END
    ELSE
    BEGIN
        PRINT 'dbo.StockTakeLocks already exists.';
    END;


    PRINT '=== Step 2: Create indexes for dbo.StockTakeLocks ===';

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.StockTakeLocks')
          AND name = 'IX_StockTakeLocks_StockTakeId'
    )
    BEGIN
        CREATE INDEX IX_StockTakeLocks_StockTakeId
            ON dbo.StockTakeLocks(StockTakeId);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.StockTakeLocks')
          AND name = 'IX_StockTakeLocks_WarehouseId_IsActive'
    )
    BEGIN
        CREATE INDEX IX_StockTakeLocks_WarehouseId_IsActive
            ON dbo.StockTakeLocks(WarehouseId, IsActive);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.StockTakeLocks')
          AND name = 'IX_StockTakeLocks_BinId_IsActive'
    )
    BEGIN
        CREATE INDEX IX_StockTakeLocks_BinId_IsActive
            ON dbo.StockTakeLocks(BinId, IsActive)
            WHERE BinId IS NOT NULL;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.StockTakeLocks')
          AND name = 'IX_StockTakeLocks_IsActive'
    )
    BEGIN
        CREATE INDEX IX_StockTakeLocks_IsActive
            ON dbo.StockTakeLocks(IsActive);
    END;


    PRINT '=== Step 3: Drop dependencies and old columns LockedBy / LockedAt from dbo.StockTakes ===';

    DECLARE @sql NVARCHAR(MAX);

    /* 3.1 Drop foreign keys on LockedBy / LockedAt */
    ;WITH FKToDrop AS (
        SELECT DISTINCT fk.name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc
            ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c
            ON c.object_id = fkc.parent_object_id
           AND c.column_id = fkc.parent_column_id
        WHERE fkc.parent_object_id = OBJECT_ID('dbo.StockTakes')
          AND c.name IN ('LockedBy', 'LockedAt')
    )
    SELECT @sql = STRING_AGG(
        'ALTER TABLE dbo.StockTakes DROP CONSTRAINT ' + QUOTENAME(name),
        ';' + CHAR(10)
    )
    FROM FKToDrop;

    IF @sql IS NOT NULL AND LEN(@sql) > 0
    BEGIN
        PRINT 'Dropping foreign keys on LockedBy / LockedAt...';
        EXEC sp_executesql @sql;
    END;


    /* 3.2 Drop check constraints referencing LockedBy / LockedAt */
    SET @sql = NULL;

    ;WITH CKToDrop AS (
        SELECT DISTINCT cc.name
        FROM sys.check_constraints cc
        WHERE cc.parent_object_id = OBJECT_ID('dbo.StockTakes')
          AND (
                cc.definition LIKE '%[[]LockedBy[]]%'
             OR cc.definition LIKE '% LockedBy %'
             OR cc.definition LIKE '%[[]LockedAt[]]%'
             OR cc.definition LIKE '% LockedAt %'
          )
    )
    SELECT @sql = STRING_AGG(
        'ALTER TABLE dbo.StockTakes DROP CONSTRAINT ' + QUOTENAME(name),
        ';' + CHAR(10)
    )
    FROM CKToDrop;

    IF @sql IS NOT NULL AND LEN(@sql) > 0
    BEGIN
        PRINT 'Dropping check constraints on LockedBy / LockedAt...';
        EXEC sp_executesql @sql;
    END;


    /* 3.3 Drop default constraints on LockedBy / LockedAt */
    SET @sql = NULL;

    ;WITH DFToDrop AS (
        SELECT DISTINCT dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
            ON c.object_id = dc.parent_object_id
           AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.StockTakes')
          AND c.name IN ('LockedBy', 'LockedAt')
    )
    SELECT @sql = STRING_AGG(
        'ALTER TABLE dbo.StockTakes DROP CONSTRAINT ' + QUOTENAME(name),
        ';' + CHAR(10)
    )
    FROM DFToDrop;

    IF @sql IS NOT NULL AND LEN(@sql) > 0
    BEGIN
        PRINT 'Dropping default constraints on LockedBy / LockedAt...';
        EXEC sp_executesql @sql;
    END;


    /* 3.4 Drop indexes containing LockedBy / LockedAt */
    SET @sql = NULL;

    ;WITH IDXToDrop AS (
        SELECT DISTINCT i.name
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic
            ON i.object_id = ic.object_id
           AND i.index_id = ic.index_id
        INNER JOIN sys.columns c
            ON c.object_id = ic.object_id
           AND c.column_id = ic.column_id
        WHERE i.object_id = OBJECT_ID('dbo.StockTakes')
          AND c.name IN ('LockedBy', 'LockedAt')
          AND i.is_primary_key = 0
          AND i.is_unique_constraint = 0
          AND i.name IS NOT NULL
    )
    SELECT @sql = STRING_AGG(
        'DROP INDEX ' + QUOTENAME(name) + ' ON dbo.StockTakes',
        ';' + CHAR(10)
    )
    FROM IDXToDrop;

    IF @sql IS NOT NULL AND LEN(@sql) > 0
    BEGIN
        PRINT 'Dropping indexes on LockedBy / LockedAt...';
        EXEC sp_executesql @sql;
    END;


    /* 3.5 Drop columns */
    IF COL_LENGTH('dbo.StockTakes', 'LockedBy') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.StockTakes DROP COLUMN LockedBy;
        PRINT 'Dropped dbo.StockTakes.LockedBy';
    END
    ELSE
    BEGIN
        PRINT 'dbo.StockTakes.LockedBy does not exist.';
    END;

    IF COL_LENGTH('dbo.StockTakes', 'LockedAt') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.StockTakes DROP COLUMN LockedAt;
        PRINT 'Dropped dbo.StockTakes.LockedAt';
    END
    ELSE
    BEGIN
        PRINT 'dbo.StockTakes.LockedAt does not exist.';
    END;


    COMMIT TRAN;
    PRINT '=== DONE ===';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    PRINT '=== ERROR ===';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH;