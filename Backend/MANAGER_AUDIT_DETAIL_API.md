# Audit Review Detail API Response - Manager Perspective

## Endpoint
```
GET /api/manager/audits/{stockTakeId}/review-detail
```

## Response Structure

Manager sẽ nhận được response với **cái nhìn toàn diện** về audit:

```json
{
  "stockTakeId": 1,
  "title": "Kho A - Tháng 12",
  "status": "InProgress",
  "warehouseId": 1,
  "warehouseName": "Kho ABC",
  "plannedStartDate": "2024-12-20T00:00:00",
  "plannedEndDate": "2024-12-25T00:00:00",
  "notes": "Kiểm kho định kỳ",
  
  "metrics": {
    "stockTakeId": 1,
    "title": "Kho A - Tháng 12",
    "status": "InProgress",
    "totalItems": 500,
    "countedItems": 350,
    "uncountedItems": 150,
    "matchedItems": 320,
    "discrepancyItems": 30,
    "matchRate": 91.43
  },
  
  "varianceSummary": {
    "totalVariances": 30,
    "resolvedVariances": 10,
    "unresolvedVariances": 20,
    "resolutionRate": 33.33
  },
  
  "timeline": {
    "createdAt": "2024-12-15T08:30:00",
    "createdByName": "Nguyễn Văn A",
    "checkDate": "2024-12-20T09:00:00",
    "lockedAt": null,
    "lockedByName": null,
    "completedAt": null,
    "completedByName": null
  },
  
  "teamMembers": [
    {
      "userId": 4,
      "fullName": "Trần Văn B",
      "email": "tranb@company.com",
      "assignedAt": "2024-12-15T08:35:00",
      "completedAt": null,
      "isActive": true
    },
    {
      "userId": 5,
      "fullName": "Lê Thị C",
      "email": "lethic@company.com",
      "assignedAt": "2024-12-15T08:35:00",
      "completedAt": "2024-12-20T15:30:00",
      "isActive": true
    }
  ],
  
  "signatures": [
    {
      "userId": 1,
      "fullName": "Admin Manager",
      "role": "Manager",
      "signedAt": "2024-12-20T16:00:00",
      "notes": "Duyệt xong phần manager"
    }
  ]
}
```

---

## Các Phần Thông Tin Chi Tiết

### 1. **Basic Info** (Thông tin cơ bản)
```json
{
  "stockTakeId": 1,
  "title": "Kho A - Tháng 12",
  "status": "InProgress",
  "warehouseId": 1,
  "warehouseName": "Kho ABC",
  "plannedStartDate": "2024-12-20",
  "plannedEndDate": "2024-12-25",
  "notes": "Ghi chú thêm"
}
```
**Dùng để:** Xác định audit nào, kho nào, trạng thái hiện tại

---

### 2. **Metrics** (Thống kê đếm kho)
```json
{
  "totalItems": 500,           // Tổng số SKU trong kho
  "countedItems": 350,         // Đã đếm được
  "uncountedItems": 150,       // Chưa đếm
  "matchedItems": 320,         // Trùng khớp
  "discrepancyItems": 30,      // Có sai lệch
  "matchRate": 91.43           // % trùng khớp = matched / counted * 100
}
```
**Dùng để:** Manager nắm được tiến độ đếm kho
- Nếu `uncountedItems` cao → cần thúc staff đếm thêm
- Nếu `matchRate` thấp → có nhiều sai lệch cần giải quyết

---

### 3. **Variance Summary** (Tóm tắt sai lệch)
```json
{
  "totalVariances": 30,        // Tổng số sai lệch
  "resolvedVariances": 10,     // Đã xử lý
  "unresolvedVariances": 20,   // Chưa xử lý
  "resolutionRate": 33.33      // % đã xử lý = resolved / total * 100
}
```
**Dùng để:** Manager biết còn bao nhiêu sai lệch cần quyết định
- Nếu `unresolvedVariances` còn cao → chưa sẵn sàng hoàn thành
- Nếu `resolutionRate` 100% → có thể hoàn thành audit

---

### 4. **Timeline** (Lịch sử các bước)
```json
{
  "createdAt": "2024-12-15T08:30:00",
  "createdByName": "Nguyễn Văn A",
  "checkDate": "2024-12-20T09:00:00",      // Lần đầu staff bắt đầu đếm
  "lockedAt": null,
  "lockedByName": null,
  "completedAt": null,
  "completedByName": null
}
```
**Dùng để:** Theo dõi quá trình audit
- Khi nào tạo audit
- Khi nào bắt đầu đếm
- Khi nào khóa (locked)
- Khi nào hoàn thành

---

### 5. **Team Members** (Nhân viên làm việc)
```json
[
  {
    "userId": 4,
    "fullName": "Trần Văn B",
    "email": "tranb@company.com",
    "assignedAt": "2024-12-15T08:35:00",
    "completedAt": null,                   // null nếu chưa xong
    "isActive": true
  }
]
```
**Dùng để:** Manager xem ai được giao việc, ai hoàn thành rồi

---

### 6. **Signatures** (Ký xác nhận)
```json
[
  {
    "userId": 1,
    "fullName": "Admin Manager",
    "role": "Manager",
    "signedAt": "2024-12-20T16:00:00",
    "notes": "Duyệt xong phần manager"
  }
]
```
**Dùng để:** Theo dõi ai đã ký xác nhận (Staff, Manager)

---

## Use Cases

### **Scenario 1: Manager vừa tạo audit, xem chi tiết**
- Xem Basic Info → Confirm chuẩn không
- Xem TeamMembers → Ai đang làm việc
- Xem Timeline → Vừa tạo lúc nào

### **Scenario 2: Manager muốn xem tiến độ**
- Xem Metrics → `uncountedItems = 150` → cần thúc staff đếm tiếp
- Xem VarianceSummary → `unresolvedVariances = 20` → cần giải quyết

### **Scenario 3: Manager muốn hoàn thành audit**
- Xem VarianceSummary → nếu `unresolvedVariances = 0` → OK xóa
- Xem Signatures → kiểm tra ai đã ký rồi

### **Scenario 4: Manager muốn tra cứu lịch sử**
- Xem Timeline → khi tạo, khi bắt đầu, khi hoàn thành
- Xem TeamMembers.completedAt → staff nào hoàn thành khi nào
- Xem Signatures → ai ký duyệt

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | ✅ Thành công, trả về audit detail |
| 404 | ❌ Không tìm thấy audit |
| 401 | ❌ Chưa xác thực (cần JWT token) |
| 403 | ❌ Không có quyền xem audit này |

---

## Example Usage

### Frontend React/Vue call:
```javascript
// Lấy chi tiết audit
async function getAuditDetail(stockTakeId) {
  const response = await fetch(
    `/api/manager/audits/${stockTakeId}/review-detail`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  // Hiển thị metrics
  console.log(`Đã đếm: ${data.metrics.countedItems}/${data.metrics.totalItems}`);
  console.log(`Match rate: ${data.metrics.matchRate}%`);
  
  // Hiển thị variance status
  console.log(`Sai lệch: ${data.varianceSummary.unresolvedVariances} chưa xử lý`);
  
  // Hiển thị team
  console.log(`Team: ${data.teamMembers.map(m => m.fullName).join(', ')}`);
}
```

---

## Notes

✅ **Dữ liệu thực-time**: Mỗi lần gọi đều lấy dữ liệu mới từ DB
✅ **Toàn diện**: Manager thấy được tất cả thông tin cần thiết
✅ **Tối ưu**: Query được tối ưu với `.AsNoTracking()` để performance tốt
✅ **An toàn**: Chỉ lấy dữ liệu của audit cụ thể, không lộ thông tin khác
