IF COL_LENGTH('IncidentReports', 'Status') IS NOT NULL
BEGIN
    ALTER TABLE IncidentReports ALTER COLUMN Status nvarchar(50) NOT NULL;
END;
