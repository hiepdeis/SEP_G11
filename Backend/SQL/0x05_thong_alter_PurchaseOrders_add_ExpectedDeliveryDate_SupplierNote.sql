IF COL_LENGTH('PurchaseOrders', 'ExpectedDeliveryDate') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD ExpectedDeliveryDate datetime NULL;
END;

IF COL_LENGTH('PurchaseOrders', 'SupplierNote') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD SupplierNote nvarchar(500) NULL;
END;
