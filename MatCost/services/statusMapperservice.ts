// Định nghĩa kiểu dữ liệu trả về cho an toàn
export interface DisplayStatus {
  text: string;
  color: string; // Tên màu cho Ant Design/MUI hoặc class Tailwind
  step: number;  // Số thứ tự cho thanh Tracking Timeline
}

export const getDisplayStatus = (backendStatus: string, role: string): DisplayStatus => {
  // 1. NẾU LÀ ĐỘI THI CÔNG (KỸ SƯ CÔNG TRƯỜNG)
  if (role === 'ConstructionTeam') {
    switch (backendStatus) {
      case 'Pending_Review':
        return { text: 'Đã gửi yêu cầu', color: 'blue', step: 1 };
        
      case 'Pending_Admin_Approval':
      case 'Admin_Approved':
      case 'Pending_Warehouse_Approval':
      case 'Processed':
      case 'Draft_Issue_Note':
        return { text: 'Đang xử lý hồ sơ', color: 'gold', step: 2 };
        
      case 'Forwarded_To_Purchasing':
      case 'Draft_Direct_PO':
        return { text: 'Đang mua ngoài', color: 'orange', step: 2 };
        
      case 'Picking_In_Progress':
        return { text: 'Kho đang soạn hàng', color: 'purple', step: 3 };
        
      case 'Ready_For_Delivery':
        return { text: 'Đang vận chuyển', color: 'cyan', step: 4 };
        
      case 'Completed':
        return { text: 'Hoàn thành', color: 'green', step: 5 };
        
      case 'Rejected':
      case 'Rejected_By_Admin':
      case 'Cancelled':
        return { text: 'Đã bị từ chối/Hủy', color: 'red', step: 0 };
        
      default:
        return { text: backendStatus, color: 'default', step: 0 };
    }
  }

  // 2. NẾU LÀ CÁC ROLE KHÁC (Kế toán, Kho, Admin...) 
  // -> Trả về đúng tên gốc hoặc format lại 1 chút cho dễ đọc
  return { text: backendStatus.replace(/_/g, ' '), color: 'default', step: 0 };
};