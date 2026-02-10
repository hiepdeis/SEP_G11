ALTER TABLE IssueSlips  ALTER COLUMN WarehouseID INT NULL;

ALTER TABLE IssueSlips  ADD ParentIssueID BIGINT NULL;

ALTER TABLE IssueSlips
ADD CONSTRAINT FK_IssueSlips_ParentIssue 
FOREIGN KEY (ParentIssueID) REFERENCES IssueSlips(IssueID);

-- Pending	Chờ duyệt	Trạng thái mặc định khi Đội thi công mới gửi yêu cầu (WarehouseID = Null).
-- Approved	Đã duyệt	Sếp (Manager) đã đồng ý chủ trương. Phiếu nằm chờ Kế toán/Thủ kho xử lý.
-- Rejected	Từ chối	Sếp không đồng ý (VD: Xin quá định mức, sai quy trình).
-- Processing	Đang xử lý	Quan trọng: Kế toán đã chỉ định kho/lô (WarehouseID có giá trị). Thủ kho đang đi soạn hàng.
-- Backorder	Chờ hàng về	Dành cho phiếu thiếu (Kho ảo): Phiếu đã được duyệt nhưng chưa có hàng để xuất.
-- Delivering	Đang giao	Hàng đã ra khỏi kho, đang trên xe tải đến công trường.
-- Completed	Hoàn thành	Đội thi công xác nhận đã nhận đủ hàng. Chốt sổ.
-- Cancelled	Đã hủy	Người tạo tự hủy yêu cầu khi chưa được duyệt.