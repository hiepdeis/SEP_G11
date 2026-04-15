-- Add AuditPenalties table + Widen StockTakes.Status

-- 1. Widen StockTakes.Status from VARCHAR(20) to VARCHAR(30)
ALTER TABLE StockTakes ALTER COLUMN Status VARCHAR(30) NOT NULL;
GO

-- 2. Create AuditPenalties table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditPenalties')
BEGIN
    CREATE TABLE AuditPenalties (
        PenaltyId INT IDENTITY(1,1) PRIMARY KEY,
        StockTakeId INT NOT NULL,
        IssuedByUserId INT NOT NULL,
        TargetUserId INT NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AuditPenalties_StockTakes FOREIGN KEY (StockTakeId) REFERENCES StockTakes(StockTakeID),
        CONSTRAINT FK_AuditPenalties_IssuedBy FOREIGN KEY (IssuedByUserId) REFERENCES Users(UserId),
        CONSTRAINT FK_AuditPenalties_TargetUser FOREIGN KEY (TargetUserId) REFERENCES Users(UserId)
    );
END
GO
