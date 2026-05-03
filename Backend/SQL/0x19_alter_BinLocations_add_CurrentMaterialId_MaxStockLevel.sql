-- Them cot de quan ly vat tu dang chiem dung trong ke
IF COL_LENGTH('BinLocations', 'CurrentMaterialID') IS NULL
BEGIN
    ALTER TABLE BinLocations ADD CurrentMaterialID INT NULL;
END
GO

-- Them cot suc chua toi da cho ke (neu chua co)
IF COL_LENGTH('BinLocations', 'MaxStockLevel') IS NULL
BEGIN
    ALTER TABLE BinLocations ADD MaxStockLevel DECIMAL(18,4) NULL;
END
GO
