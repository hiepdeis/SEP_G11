-- Thêm cột Tiêu chuẩn kỹ thuật
ALTER TABLE Materials 
ADD TechnicalStandard NVARCHAR(500) NULL;

-- Thêm cột Quy cách
ALTER TABLE Materials 
ADD Specification NVARCHAR(500) NULL;