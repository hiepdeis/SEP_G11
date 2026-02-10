
-- =============================================
-- 1. CREATE NEW TABLE: MaterialCategories
-- =============================================
PRINT '1. Creating MaterialCategories table...';
GO

CREATE TABLE MaterialCategories (
    CategoryID INT PRIMARY KEY IDENTITY(1,1),
    Code VARCHAR(50) UNIQUE NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255)
);
GO

-- =============================================
-- 2. ALTER TABLE: Users (Add new columns)
-- =============================================
PRINT '2. Updating Users table...';
GO

-- Add Email (NOT NULL)
ALTER TABLE Users ADD Email VARCHAR(100);
GO
UPDATE Users SET Email = 'user' + CAST(UserID AS VARCHAR) + '@gmail.com' WHERE Email IS NULL;
GO
ALTER TABLE Users ALTER COLUMN Email VARCHAR(100) NOT NULL;
GO
CREATE UNIQUE INDEX UQ__Users__Email ON Users(Email);
GO

-- Add RefreshToken
ALTER TABLE Users ADD RefreshToken VARCHAR(255);
GO
CREATE UNIQUE INDEX IX_Users_RefreshToken ON Users(RefreshToken) WHERE RefreshToken IS NOT NULL;
GO

-- Add RefreshTokenExpiry
ALTER TABLE Users ADD RefreshTokenExpiry DATETIME;
GO

-- Add PhoneNumber
ALTER TABLE Users ADD PhoneNumber VARCHAR(20);
GO

-- Add Status
ALTER TABLE Users ADD Status BIT NOT NULL DEFAULT 1;
GO

-- =============================================
-- 3. ALTER TABLE: Materials (Add new columns)
-- =============================================
PRINT '3. Updating Materials table...';
GO

-- Add CategoryID
ALTER TABLE Materials ADD CategoryID INT;
GO
ALTER TABLE Materials ADD CONSTRAINT FK_Materials_Category
FOREIGN KEY (CategoryID) REFERENCES MaterialCategories(CategoryID);
GO

-- Add UnitPrice
ALTER TABLE Materials ADD UnitPrice DECIMAL(18,2);
GO

-- =============================================
-- 4. ALTER TABLE: Receipts (Add new columns)
-- =============================================
PRINT '4. Updating Receipts table...';
GO

-- Add Notes
ALTER TABLE Receipts ADD Notes NVARCHAR(500);
GO

-- Add SubmittedBy
ALTER TABLE Receipts ADD SubmittedBy INT;
GO

-- Add SubmittedAt
ALTER TABLE Receipts ADD SubmittedAt DATETIME DEFAULT GETDATE();
GO

-- Add ApprovedBy
ALTER TABLE Receipts ADD ApprovedBy INT;
GO

-- Add ApprovedAt
ALTER TABLE Receipts ADD ApprovedAt DATETIME;
GO

-- =============================================
-- 5. MOVE SupplierID from Receipts to ReceiptDetails
-- =============================================
PRINT '5. Moving SupplierID from Receipts to ReceiptDetails...';
GO

-- Add SupplierID to ReceiptDetails
ALTER TABLE ReceiptDetails ADD SupplierID INT;
GO

-- Add FK constraint
ALTER TABLE ReceiptDetails ADD CONSTRAINT FK__ReceiptDetail__Supplier
FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID);
GO

-- Create index
CREATE INDEX IX_ReceiptDetails_SupplierID ON ReceiptDetails(SupplierID);
GO

-- Drop FK from Receipts (tìm tên constraint động)
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID('Receipts')
  AND referenced_object_id = OBJECT_ID('Suppliers');

IF @ConstraintName IS NOT NULL
    EXEC('ALTER TABLE Receipts DROP CONSTRAINT ' + @ConstraintName);
GO 

-- Drop index from Receipts
DROP INDEX IF EXISTS IX_Receipts_SupplierID ON Receipts;
GO

-- Drop column from Receipts
ALTER TABLE Receipts DROP COLUMN SupplierID;
GO

-- =============================================
-- DONE
-- =============================================