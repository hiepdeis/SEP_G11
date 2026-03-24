-- Add PurchaseOrderID to IncidentReports
IF COL_LENGTH('dbo.IncidentReports', 'PurchaseOrderID') IS NULL
BEGIN
    ALTER TABLE dbo.IncidentReports
    ADD PurchaseOrderID BIGINT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_IncidentReports_PurchaseOrderID'
          AND object_id = OBJECT_ID('dbo.IncidentReports')
    )
        CREATE INDEX IX_IncidentReports_PurchaseOrderID
        ON dbo.IncidentReports (PurchaseOrderID);

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_IncidentReports_PurchaseOrders'
    )
        ALTER TABLE dbo.IncidentReports
        ADD CONSTRAINT FK_IncidentReports_PurchaseOrders
        FOREIGN KEY (PurchaseOrderID) REFERENCES dbo.PurchaseOrders(PurchaseOrderID);
END

-- Create IncidentEvidenceImages
IF OBJECT_ID('dbo.IncidentEvidenceImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.IncidentEvidenceImages (
        Id BIGINT IDENTITY(1,1) NOT NULL,
        IncidentReportDetailID BIGINT NOT NULL,
        ImageData NVARCHAR(MAX) NOT NULL,
        UploadedAt DATETIME NOT NULL CONSTRAINT DF_IncidentEvidenceImages_UploadedAt DEFAULT (getdate()),
        UploadedByStaffId INT NOT NULL,
        CONSTRAINT PK_IncidentEvidenceImages PRIMARY KEY (Id),
        CONSTRAINT FK_IncidentEvidenceImages_IncidentReportDetails
            FOREIGN KEY (IncidentReportDetailID) REFERENCES dbo.IncidentReportDetails(DetailID) ON DELETE CASCADE
    );

    CREATE INDEX IX_IncidentEvidenceImages_IncidentReportDetailID
        ON dbo.IncidentEvidenceImages (IncidentReportDetailID);
END
