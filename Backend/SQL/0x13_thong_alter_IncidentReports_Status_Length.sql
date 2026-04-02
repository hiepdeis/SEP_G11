IF COL_LENGTH('IncidentReports', 'Status') IS NOT NULL
BEGIN
    ALTER TABLE IncidentReports ALTER COLUMN Status nvarchar(100) NOT NULL;
END;