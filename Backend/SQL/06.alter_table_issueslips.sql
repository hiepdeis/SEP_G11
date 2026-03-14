-- Thêm các cột mới để khớp với giao diện React
ALTER TABLE IssueSlips ADD WorkItem NVARCHAR(255) NULL;          -- Hạng mục
ALTER TABLE IssueSlips ADD Department NVARCHAR(200) NULL;        -- Đơn vị yêu cầu
ALTER TABLE IssueSlips ADD DeliveryLocation NVARCHAR(500) NULL;  -- Nơi nhận
ALTER TABLE IssueSlips ADD ReferenceCode NVARCHAR(100) NULL;     -- Mã tham chiếu