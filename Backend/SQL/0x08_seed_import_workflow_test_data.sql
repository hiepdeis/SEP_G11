SET NOCOUNT ON;

BEGIN TRY
    BEGIN TRAN;

    -- Safety: turn off any lingering IDENTITY_INSERT from prior failed runs
    BEGIN TRY SET IDENTITY_INSERT dbo.BinLocations OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.MaterialCategories OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Materials OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Suppliers OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.SupplierContracts OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.SupplierQuotations OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Batches OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.StockShortageAlerts OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.PurchaseRequests OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.PurchaseRequestItems OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.PurchaseOrders OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.PurchaseOrderItems OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Receipts OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.ReceiptDetails OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.QCChecks OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.QCCheckDetails OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.IncidentReports OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.IncidentReportDetails OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.SupplementaryReceipts OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.SupplementaryReceiptItems OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.InventoryCurrent OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.WarehouseCards OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Notifications OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Projects OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Users OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Roles OFF; END TRY BEGIN CATCH END CATCH;
    BEGIN TRY SET IDENTITY_INSERT dbo.Warehouses OFF; END TRY BEGIN CATCH END CATCH;

    -- NOTE: This script assumes a test DB focused on import workflow data.
    -- If other modules reference Users/Materials/Warehouses, delete those rows first.

    -- =========================
    -- Delete old data (children -> parents)
    -- =========================
    DELETE FROM dbo.WarehouseCards;
    DELETE FROM dbo.InventoryCurrent;
    DELETE FROM dbo.QCCheckDetails;
    DELETE FROM dbo.IncidentReportDetails;
    DELETE FROM dbo.SupplementaryReceiptItems;
    DELETE FROM dbo.SupplementaryReceipts;
    DELETE FROM dbo.IncidentReports;
    DELETE FROM dbo.QCChecks;
    DELETE FROM dbo.ReceiptDetails;
    DELETE FROM dbo.ReceiptRejectionHistories;
    DELETE FROM dbo.Receipts;
    DELETE FROM dbo.PurchaseOrderItems;
    DELETE FROM dbo.PurchaseOrders;
    DELETE FROM dbo.PurchaseRequestItems;
    DELETE FROM dbo.PurchaseRequests;
    DELETE FROM dbo.StockShortageAlerts;
    DELETE FROM dbo.SupplierQuotations;
    DELETE FROM dbo.SupplierContracts;
    DELETE FROM dbo.Batches;
    DELETE FROM dbo.BinLocations;
    DELETE FROM dbo.Materials;
    DELETE FROM dbo.MaterialCategories;
    DELETE FROM dbo.Suppliers;
    DELETE FROM dbo.Projects;
    DELETE FROM dbo.Notifications;
    DELETE FROM dbo.Users;
    DELETE FROM dbo.Roles;
    DELETE FROM dbo.Warehouses;

    -- =========================
    -- Seed master data
    -- =========================
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Roles') AND name = 'RoleID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Roles ON;

    INSERT INTO dbo.Roles (RoleID, RoleName)
    VALUES
        (1, 'Admin'),
        (2, 'Manager'),
        (3, 'Purchasing'),
        (4, 'Accountant'),
        (5, 'Staff');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Roles') AND name = 'RoleID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Roles OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'UserID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Users ON;

    INSERT INTO dbo.Users (UserID, Username, PasswordHash, RoleID, FullName, Email, PhoneNumber, Status)
    VALUES
        (1, 'admin', 'hashed', 1, 'Admin User', 'admin@example.com', '0900000001', 1),
        (2, 'manager', 'hashed', 2, 'Warehouse Manager', 'manager@example.com', '0900000002', 1),
        (3, 'purchasing', 'hashed', 3, 'Purchasing User', 'purchasing@example.com', '0900000003', 1),
        (4, 'accountant', 'hashed', 4, 'Accountant User', 'accountant@example.com', '0900000004', 1),
        (5, 'staff', 'hashed', 5, 'Warehouse Staff', 'staff@example.com', '0900000005', 1),
        (6, 'staff2', 'hashed', 5, 'Warehouse Staff 2', 'staff2@example.com', '0900000006', 1),
        (7, 'purchasing2', 'hashed', 3, 'Purchasing User 2', 'purchasing2@example.com', '0900000007', 1),
        (8, 'accountant2', 'hashed', 4, 'Accountant User 2', 'accountant2@example.com', '0900000008', 1);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'UserID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Users OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Projects') AND name = 'ProjectID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Projects ON;

    INSERT INTO dbo.Projects (ProjectID, Code, Name, StartDate, EndDate, Budget, Status)
    VALUES
        (1, 'PRJ-001', 'Import Workflow Project', '2026-01-01', '2026-12-31', 100000000.00, 'Active'),
        (2, 'PRJ-002', 'New Warehouse Expansion', '2026-02-01', '2026-11-30', 50000000.00, 'Active');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Projects') AND name = 'ProjectID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Projects OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'WarehouseID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Warehouses ON;

    INSERT INTO dbo.Warehouses (WarehouseID, Name, Address)
    VALUES
        (1, 'Main Warehouse', '123 Warehouse St'),
        (2, 'Secondary Warehouse', '456 Logistics Ave');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'WarehouseID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Warehouses OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BinLocations') AND name = 'BinID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.BinLocations ON;

    INSERT INTO dbo.BinLocations (BinID, WarehouseID, Code, Type)
    VALUES
        (1, 1, 'A-01', 'Default'),
        (2, 1, 'B-01', 'Default'),
        (3, 1, 'A-02', 'Overflow'),
        (4, 2, 'C-01', 'Default'),
        (5, 2, 'C-02', 'Cold');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BinLocations') AND name = 'BinID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.BinLocations OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaterialCategories') AND name = 'CategoryID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.MaterialCategories ON;

    INSERT INTO dbo.MaterialCategories (CategoryID, Code, Name, Description)
    VALUES
        (11, 'CAT-PACK', 'Packaging', 'Packaging materials'),
        (12, 'CAT-CHEM', 'Chemicals', 'Chemical inputs'),
        (13, 'CAT-PART', 'Spare Parts', 'Machine spare parts');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MaterialCategories') AND name = 'CategoryID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.MaterialCategories OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Materials') AND name = 'MaterialID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Materials ON;

    INSERT INTO dbo.Materials (MaterialID, Code, Name, Unit, IsDecimalUnit, MinStockLevel, MaxStockLevel, UnitPrice, CategoryID)
    VALUES
        (101, 'MAT-001', 'PET Bottle', 'pcs', 0, 1000, 10000, 700.00, 11),
        (102, 'MAT-002', 'Bottle Cap', 'pcs', 0, 500, 8000, 300.00, 11),
        (103, 'MAT-003', 'Shrink Film', 'kg', 1, 200, 5000, 120.00, 11),
        (104, 'MAT-004', 'Cleaning Agent', 'ltr', 1, 100, 2000, 80.00, 12),
        (105, 'MAT-005', 'Conveyor Belt', 'pcs', 0, 5, 50, 2500.00, 13);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Materials') AND name = 'MaterialID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Materials OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Suppliers') AND name = 'SupplierID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Suppliers ON;

    INSERT INTO dbo.Suppliers (SupplierID, Code, Name, TaxCode, Address)
    VALUES
        (201, 'SUP-001', 'ABC Plastics', 'TAX-001', '45 Supplier Road'),
        (202, 'SUP-002', 'VN Packaging Co', 'TAX-002', '88 Industrial Park'),
        (203, 'SUP-003', 'CleanChem Ltd', 'TAX-003', '12 Chemical Zone');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Suppliers') AND name = 'SupplierID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Suppliers OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplierContracts') AND name = 'ContractID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplierContracts ON;

    INSERT INTO dbo.SupplierContracts (ContractID, ContractCode, ContractNumber, SupplierID, EffectiveFrom, EffectiveTo, LeadTimeDays, PaymentTerms, DeliveryTerms, Status, IsActive, Notes)
    VALUES
        (301, 'CT-ABC-2026', 'CN-2026-ABC', 201, '2026-01-01', '2026-12-31', 7, 'Net 30', 'FOB', 'Active', 1, 'Annual contract'),
        (302, 'CT-VNP-2026', 'CN-2026-VNP', 202, '2026-01-01', '2026-12-31', 5, 'Net 15', 'CIF', 'Active', 1, 'Packaging supply'),
        (303, 'CT-CHM-2026', 'CN-2026-CHM', 203, '2026-01-01', '2026-12-31', 10, 'Net 45', 'FOB', 'Active', 1, 'Chemicals supply');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplierContracts') AND name = 'ContractID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplierContracts OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplierQuotations') AND name = 'QuoteID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplierQuotations ON;

    INSERT INTO dbo.SupplierQuotations (QuoteID, SupplierID, MaterialID, Price, Currency, ValidFrom, ValidTo, IsActive)
    VALUES
        (401, 201, 101, 700.00, 'VND', '2026-01-01', '2026-12-31', 1),
        (402, 201, 102, 300.00, 'VND', '2026-01-01', '2026-12-31', 1),
        (403, 202, 103, 120.00, 'VND', '2026-01-01', '2026-12-31', 1),
        (404, 203, 104, 80.00, 'VND', '2026-01-01', '2026-12-31', 1),
        (405, 202, 105, 2500.00, 'VND', '2026-01-01', '2026-12-31', 1);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplierQuotations') AND name = 'QuoteID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplierQuotations OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Batches') AND name = 'BatchID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Batches ON;

    INSERT INTO dbo.Batches (BatchID, MaterialID, BatchCode, MfgDate, CertificateImage, CreatedDate)
    VALUES
        (1001, 101, 'BATCH-MAT-001-20260323-0001', '2026-03-20', NULL, '2026-03-23'),
        (1002, 102, 'BATCH-MAT-002-20260323-0001', '2026-03-20', NULL, '2026-03-23'),
        (1003, 103, 'BATCH-MAT-003-20260323-0001', '2026-03-20', NULL, '2026-03-23'),
        (1004, 104, 'BATCH-MAT-004-20260323-0001', '2026-03-20', NULL, '2026-03-23'),
        (1005, 105, 'BATCH-MAT-005-20260323-0001', '2026-03-20', NULL, '2026-03-23');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Batches') AND name = 'BatchID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Batches OFF;

    -- =========================
    -- Seed workflow data
    -- =========================
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockShortageAlerts') AND name = 'AlertID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.StockShortageAlerts ON;

    INSERT INTO dbo.StockShortageAlerts (AlertID, MaterialID, WarehouseID, CurrentQuantity, MinStockLevel, SuggestedQuantity, Status, Priority, CreatedAt, ConfirmedAt, ConfirmedBy, Notes)
    VALUES
        (501, 101, 1, 400.0000, 1000, 5000.0000, 'ManagerConfirmed', 'High', '2026-03-22', '2026-03-22', 2, 'Need urgent restock'),
        (502, 102, 1, 200.0000, 500, 2000.0000, 'Pending', 'Medium', '2026-03-22', NULL, NULL, NULL);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.StockShortageAlerts') AND name = 'AlertID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.StockShortageAlerts OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseRequests') AND name = 'RequestID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseRequests ON;

    INSERT INTO dbo.PurchaseRequests (RequestID, RequestCode, ProjectID, AlertID, CreatedBy, CreatedAt, Status)
    VALUES
        (701, 'PR-20260323-001', 1, 501, 1, '2026-03-22', 'DraftPO'),
        (702, 'PR-20260323-002', 1, 502, 1, '2026-03-22', 'DraftPO'),
        (703, 'PR-20260323-003', 1, NULL, 1, '2026-03-22', 'DraftPO');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseRequests') AND name = 'RequestID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseRequests OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseRequestItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseRequestItems ON;

    INSERT INTO dbo.PurchaseRequestItems (ItemID, RequestID, MaterialID, WarehouseID, Quantity, Notes)
    VALUES
        (702, 701, 101, 1, 5000.0000, 'Restock MAT-001'),
        (703, 702, 102, 1, 2000.0000, 'Restock MAT-002'),
        (704, 703, 101, 1, 1000.0000, 'Replacement batch');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseRequestItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseRequestItems OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseOrders') AND name = 'PurchaseOrderID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseOrders ON;

    INSERT INTO dbo.PurchaseOrders (PurchaseOrderID, PurchaseOrderCode, RequestID, ProjectID, SupplierID, SupplierContractID, CreatedBy, CreatedAt, Status, AccountantApprovedBy, AccountantApprovedAt, AdminApprovedBy, AdminApprovedAt, SentToSupplierAt, ExpectedDeliveryDate, SupplierNote, TotalAmount)
    VALUES
        (9001, 'PO-20260323-001', 701, 1, 201, 301, 3, '2026-03-22', 'SentToSupplier', 4, '2026-03-22', 1, '2026-03-22', '2026-03-22', '2026-03-28', 'Confirmed by supplier', 3500000.00),
        (9002, 'PO-20260323-002', 702, 1, 201, 301, 3, '2026-03-22', 'FullyReceived', 4, '2026-03-22', 1, '2026-03-22', '2026-03-22', '2026-03-27', 'Delivered on time', 600000.00),
        (9003, 'PO-20260323-003', 703, 1, 201, 301, 3, '2026-03-22', 'SentToSupplier', 4, '2026-03-22', 1, '2026-03-22', '2026-03-22', '2026-03-29', 'Incident replacement order', 700000.00);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseOrders') AND name = 'PurchaseOrderID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseOrders OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseOrderItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseOrderItems ON;

    INSERT INTO dbo.PurchaseOrderItems (ItemID, PurchaseOrderID, SupplierID, MaterialID, OrderedQuantity, UnitPrice, LineTotal)
    VALUES
        (9101, 9001, 201, 101, 5000.0000, 700.00, 3500000.00),
        (9102, 9002, 201, 102, 2000.0000, 300.00, 600000.00),
        (9103, 9003, 201, 101, 1000.0000, 700.00, 700000.00);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PurchaseOrderItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.PurchaseOrderItems OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Receipts') AND name = 'ReceiptID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Receipts ON;

    INSERT INTO dbo.Receipts (ReceiptID, ReceiptCode, WarehouseID, CreatedBy, ReceiptDate, Status, TotalAmount, PurchaseOrderID, ConfirmedBy, ConfirmedAt)
    VALUES
        (3001, 'RC20260323-0001', 1, 5, '2026-03-23', 'PendingQC', 3500000.00, 9001, NULL, NULL),
        (3002, 'RC20260323-0002', 1, 5, '2026-03-23', 'Completed', 600000.00, 9002, 5, '2026-03-23'),
        (3003, 'RC20260323-0003', 1, 5, '2026-03-23', 'PendingIncident', 700000.00, 9003, NULL, NULL);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Receipts') AND name = 'ReceiptID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Receipts OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ReceiptDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.ReceiptDetails ON;

    INSERT INTO dbo.ReceiptDetails (DetailID, ReceiptID, MaterialID, SupplierID, BatchID, Quantity, UnitPrice, LineTotal, ActualQuantity, BinLocationID)
    VALUES
        (3101, 3001, 101, 201, 1001, 5000.0000, 700.00, 3500000.00, 5000.0000, 1),
        (3102, 3002, 102, 201, 1002, 2000.0000, 300.00, 600000.00, 2000.0000, 2),
        (3103, 3003, 101, 201, 1001, 1000.0000, 700.00, 700000.00, 1000.0000, 1);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ReceiptDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.ReceiptDetails OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QCChecks') AND name = 'QCCheckID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.QCChecks ON;

    INSERT INTO dbo.QCChecks (QCCheckID, QCCheckCode, ReceiptID, CheckedBy, CheckedAt, OverallResult, Notes)
    VALUES
        (4001, 'QC-20260323-0001', 3002, 5, '2026-03-23', 'Pass', 'All items passed'),
        (4002, 'QC-20260323-0002', 3003, 5, '2026-03-23', 'Fail', 'Quality issue detected');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QCChecks') AND name = 'QCCheckID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.QCChecks OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QCCheckDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.QCCheckDetails ON;

    INSERT INTO dbo.QCCheckDetails (DetailID, QCCheckID, ReceiptDetailID, Result, FailReason, PassQuantity, FailQuantity)
    VALUES
        (4101, 4001, 3102, 'Pass', NULL, 2000.0000, 0.0000),
        (4102, 4002, 3103, 'Fail', 'Crack on surface', 800.0000, 200.0000);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.QCCheckDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.QCCheckDetails OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.IncidentReports') AND name = 'IncidentID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.IncidentReports ON;

    INSERT INTO dbo.IncidentReports (IncidentID, IncidentCode, ReceiptID, QCCheckID, CreatedBy, CreatedAt, Description, Status, Resolution, ResolvedAt, ResolvedBy)
    VALUES
        (8001, 'INC-20260323-0001', 3003, 4002, 5, '2026-03-23', 'Quality issue reported by staff', 'PendingManagerReview', NULL, NULL, NULL);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.IncidentReports') AND name = 'IncidentID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.IncidentReports OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.IncidentReportDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.IncidentReportDetails ON;

    INSERT INTO dbo.IncidentReportDetails (DetailID, IncidentID, ReceiptDetailID, MaterialID, ExpectedQuantity, ActualQuantity, IssueType, Notes)
    VALUES
        (8101, 8001, 3103, 101, 1000.0000, 1000.0000, 'Quality', 'Surface crack found');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.IncidentReportDetails') AND name = 'DetailID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.IncidentReportDetails OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplementaryReceipts') AND name = 'SupplementaryReceiptID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplementaryReceipts ON;

    INSERT INTO dbo.SupplementaryReceipts (SupplementaryReceiptID, PurchaseOrderID, IncidentID, Status, SupplierNote, ExpectedDeliveryDate, CreatedByPurchasingId, CreatedAt, ApprovedByManagerId, ApprovedAt)
    VALUES
        (8501, 9003, 8001, 'PendingManagerApproval', 'Supplier agrees to replace 200 units', '2026-03-30', 3, '2026-03-23', NULL, NULL);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplementaryReceipts') AND name = 'SupplementaryReceiptID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplementaryReceipts OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplementaryReceiptItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplementaryReceiptItems ON;

    INSERT INTO dbo.SupplementaryReceiptItems (ItemID, SupplementaryReceiptID, MaterialID, SupplementaryQuantity)
    VALUES
        (8601, 8501, 101, 200.0000);

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SupplementaryReceiptItems') AND name = 'ItemID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.SupplementaryReceiptItems OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InventoryCurrent') AND name = 'ID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.InventoryCurrent ON;

    INSERT INTO dbo.InventoryCurrent (ID, WarehouseID, BinID, MaterialID, BatchID, QuantityOnHand, QuantityAllocated, LastUpdated)
    VALUES
        (1, 1, 1, 101, 1001, 200.0000, 0.0000, '2026-03-23'),
        (2, 1, 2, 102, 1002, 100.0000, 0.0000, '2026-03-23'),
        (3, 1, 3, 103, 1003, 50.0000, 0.0000, '2026-03-23'),
        (4, 2, 4, 104, 1004, 20.0000, 0.0000, '2026-03-23'),
        (5, 2, 5, 105, 1005, 2.0000, 0.0000, '2026-03-23');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InventoryCurrent') AND name = 'ID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.InventoryCurrent OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.WarehouseCards') AND name = 'CardID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.WarehouseCards ON;

    INSERT INTO dbo.WarehouseCards (CardID, CardCode, WarehouseID, MaterialID, BinID, BatchID, TransactionType, ReferenceID, ReferenceType, TransactionDate, Quantity, QuantityBefore, QuantityAfter, CreatedBy, Notes)
    VALUES
        (6001, 'WC-20260323-0001', 1, 102, 2, 1002, 'Import', 3002, 'Receipt', '2026-03-23', 2000.0000, 0.0000, 2000.0000, 5, 'QC pass update');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.WarehouseCards') AND name = 'CardID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.WarehouseCards OFF;

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'NotiID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Notifications ON;

    INSERT INTO dbo.Notifications (NotiID, UserID, Message, RelatedEntityType, RelatedEntityId, IsRead, CreatedAt)
    VALUES
        (90001, 2, 'New incident INC-20260323-0001 requires manager review.', 'IncidentReport', 8001, 0, '2026-03-23');

    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'NotiID' AND is_identity = 1)
        SET IDENTITY_INSERT dbo.Notifications OFF;

    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    THROW;
END CATCH;
