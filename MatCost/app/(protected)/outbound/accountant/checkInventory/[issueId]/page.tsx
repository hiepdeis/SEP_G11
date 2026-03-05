"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { issueSlipApi, IssueSlipAllocation } from "@/services/issueslip-service";
import { useParams } from "next/navigation";

const AllocationPage = () => {
  const params = useParams();
  const issueId = Number(params?.issueId || params?.id);
  const [allocation, setAllocation] = useState<IssueSlipAllocation | null>(null);
  const [loading, setLoading] = useState(true);
 const [selectedBatches, setSelectedBatches] = useState<{ [detailId: number]: number }>({});

  useEffect(() => {
    if (!issueId) return;
    const fetchAllocation = async () => {
      try {
        const data = await issueSlipApi.getIssueSlipAllocation(issueId);
        setAllocation(data);
      } catch (error) {
        alert("Không lấy được dữ liệu phân bổ!");
      } finally {
        setLoading(false);
      }
    };
    fetchAllocation();
  }, [issueId]);


  const handleBatchChange = (detailId: number, batchId: number) => {
    setSelectedBatches((prev) => ({
      ...prev,
      [detailId]: batchId,
    }));
  };

  const handleProcess = async () => {
    if (!allocation) return;
    const items = allocation.items.map((item) => ({
      detailId: item.detailId,
      batchId: selectedBatches[item.detailId] || item.availableBatches[0]?.batchId,
      quantity: item.requestedQty,
    }));
    try {
      console.log("Gửi dữ liệu phân bổ:", { issueId: allocation.issueId, items });
      const res = await issueSlipApi.processIssueSlip(allocation.issueId, { items });
      console.log("Xuất kho thành công!", res);
      alert("Xuất kho thành công!");
    } catch (e) {
      console.error("Xuất kho thất bại!", e);
      alert("Xuất kho thất bại!");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Phân Bổ Lô Vật Tư</h1>
        {loading ? (
          <div>Đang tải...</div>
        ) : allocation ? (
          <div className="bg-white rounded shadow p-6">
            <div className="mb-4">
              <div><b>Mã phiếu:</b> {allocation.issueCode}</div>
              <div><b>Dự án:</b> {allocation.projectName}</div>
              <div><b>Trạng thái:</b> {allocation.status}</div>
            </div>
            <table className="w-full text-sm bg-gray-50 rounded mb-4">
              <thead>
                <tr>
                  <th className="p-2 text-left">Tên vật tư</th>
                  <th className="p-2 text-right">Số lượng YC</th>
                  <th className="p-2 text-right">Đơn vị</th>
                  <th className="p-2 text-right">Tồn kho</th>
                  <th className="p-2 text-center">Chọn lô</th>
                </tr>
              </thead>
              <tbody>
                {allocation.items.map((item) => (
                  <tr key={item.detailId} className="border-t">
                    <td className="p-2">{item.materialName}</td>
                    <td className="p-2 text-right">{item.requestedQty}</td>
                    <td className="p-2 text-right">{item.unit}</td>
                    <td className={`p-2 text-right ${!item.isEnough ? "text-red-600 font-bold" : ""}`}>
                      {item.totalAvailable}
                    </td>
                    <td className="p-2 text-center">
                      {item.availableBatches.length === 0 ? (
                        <span className="text-gray-400">Hết hàng</span>
                      ) : (
                        <select 
                          className="border rounded px-2 py-1"
                          value={selectedBatches[item.detailId] || item.availableBatches[0]?.batchId}
                          onChange={(e) => handleBatchChange(item.detailId, parseInt(e.target.value))}
                        >
                          {item.availableBatches.map((batch) => (
                            <option key={batch.batchId} value={batch.batchId}>
                              {batch.batchCode} - SL: {batch.quantity}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Nút xử lý */}
            {allocation.isAllEnough ? (
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleProcess}>
                Xác nhận xuất
              </button>
            ) : (
              <button className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                Tạo phiếu nợ / Xuất âm
              </button>
            )}
          </div>
        ) : (
          <div>Không tìm thấy dữ liệu phân bổ.</div>
        )}
      </div>
    </div>
  );
};

export default AllocationPage;