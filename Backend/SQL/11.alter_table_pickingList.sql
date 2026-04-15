-- Thêm vào bảng PickingList
ALTER TABLE PickingList
ADD ActualPickerId INT NULL;

-- Thêm vào bảng IssueSlips
ALTER TABLE IssueSlips
ADD AssignedPickerId INT NULL;