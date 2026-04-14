IF OBJECT_ID ('dbo.Material', 'U') IS NOT NULL BEGIN
ALTER TABLE dbo.Material
ALTER COLUMN MinStockLevel decimal(18, 4) NULL;

ALTER TABLE dbo.Material
ALTER COLUMN MaxStockLevel decimal(18, 4) NULL;

ALTER TABLE dbo.StockShortageAlert
ALTER COLUMN MinStockLevel decimal(18, 4) NULL;

END