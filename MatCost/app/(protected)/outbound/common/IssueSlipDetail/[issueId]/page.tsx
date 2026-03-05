"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { issueSlipApi, IssueSlipDetail } from "@/services/issueslip-service";
import axiosClient from "@/lib/axios-client";
import { useRouter } from "next/navigation";

const IssueSlipDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const issueId = Number(params?.issueId || params?.id); // tuỳ router cấu hình
  const [detail, setDetail] = useState<IssueSlipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewing, setReviewing] = useState(false);

  // Lấy role từ sessionStorage
  const role = sessionStorage.getItem("role");

  const handleReview = async (action: "Approved" | "Rejected") => {
    let reason = "";
    if (action === "Rejected") {
      reason = prompt("Nhập lý do từ chối:") || "";
      if (!reason.trim()) return;
    }
    setReviewing(true);
    try {
      await axiosClient.put(`/IssueSlips/${issueId}/review`, {
        action,
        reason,
      });
      alert(
        action === "Approved"
          ? "Đã duyệt phiếu xuất!"
          : "Đã từ chối phiếu xuất!"
      );
      router.refresh?.();
      window.location.reload();
    } catch (err) {
      alert("Có lỗi khi duyệt phiếu!");
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    if (!issueId) return;
    const fetchDetail = async () => {
      try {
        const data = await issueSlipApi.getIssueSlipDetail(issueId);
        setDetail(data);
      } catch (error) {
        // Xử lý lỗi nếu cần
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [issueId]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Chi tiết Phiếu Xuất</h1>
        {loading ? (
          <div>Đang tải...</div>
        ) : detail ? (
          <div className="bg-white rounded shadow p-6">
            <div className="mb-4">
              <div><b>Mã phiếu:</b> {detail.issueCode}</div>
              <div><b>Dự án:</b> {detail.projectName}</div>
              <div><b>Ngày tạo:</b> {new Date(detail.issueDate).toLocaleString()}</div>
              <div><b>Trạng thái:</b> {detail.status}</div>
              <div><b>Người tạo:</b> {detail.createdByName}</div>
              <div><b>Ghi chú:</b> {detail.description}</div>
            </div>

            {/* Chỉ hiển thị nút duyệt/từ chối nếu là Admin và phiếu đang ở trạng thái Pending */}
            {role === "WarehouseManager" && detail.status === "Pending" && (
              <div className="flex gap-3 mb-4">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={reviewing}
                  onClick={() => handleReview("Approved")}
                >
                  {reviewing ? "Đang xử lý..." : "Duyệt"}
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={reviewing}
                  onClick={() => handleReview("Rejected")}
                >
                  Từ chối
                </button>
              </div>
            )}

            <h2 className="font-semibold mb-2">Danh sách vật tư</h2>
            <table className="w-full text-sm bg-gray-50 rounded">
              <thead>
                <tr>
                  <th className="p-2 text-left">Tên vật tư</th>
                  <th className="p-2 text-left">Đơn vị</th>
                  <th className="p-2 text-right">Số lượng yêu cầu</th>
                  <th className="p-2 text-right">Tồn kho</th>
                  <th className="p-2 text-center">Đủ hàng?</th>
                  <th className="p-2 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {detail.details.map((item) => (
                  <tr key={item.detailId} className="border-t">
                    <td className="p-2">{item.materialName}</td>
                    <td className="p-2">{item.unit}</td>
                    <td className="p-2 text-right">{item.requestedQty}</td>
                    <td className="p-2 text-right">{item.totalStock}</td>
                    <td className="p-2 text-center">
                      {item.isEnough ? (
                        <span className="text-green-600 font-bold">✔</span>
                      ) : (
                        <span className="text-red-600 font-bold">✘</span>
                      )}
                    </td>
                    <td className="p-2">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>Không tìm thấy phiếu xuất.</div>
        )}
      </div>
    </div>
  );
};

export default IssueSlipDetailPage;