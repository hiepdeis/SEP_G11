-- Allow NULL ProjectID for import warehouse flow (PurchaseRequests/PurchaseOrders)
-- Safe to run multiple times.

IF OBJECT_ID('dbo.PurchaseRequests', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.PurchaseRequests', 'ProjectID') IS NOT NULL
   AND EXISTS (
       SELECT 1
       FROM sys.columns
       WHERE object_id = OBJECT_ID('dbo.PurchaseRequests')
         AND name = 'ProjectID'
         AND is_nullable = 0
   )
BEGIN
    ALTER TABLE dbo.PurchaseRequests
    ALTER COLUMN ProjectID INT NULL;

    PRINT 'PurchaseRequests.ProjectID altered to NULL.';
END
ELSE
BEGIN
    PRINT 'PurchaseRequests.ProjectID already NULL or not found.';
END

IF OBJECT_ID('dbo.PurchaseOrders', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.PurchaseOrders', 'ProjectID') IS NOT NULL
   AND EXISTS (
       SELECT 1
       FROM sys.columns
       WHERE object_id = OBJECT_ID('dbo.PurchaseOrders')
         AND name = 'ProjectID'
         AND is_nullable = 0
   )
BEGIN
    ALTER TABLE dbo.PurchaseOrders
    ALTER COLUMN ProjectID INT NULL;

    PRINT 'PurchaseOrders.ProjectID altered to NULL.';
END
ELSE
BEGIN
    PRINT 'PurchaseOrders.ProjectID already NULL or not found.';
END
