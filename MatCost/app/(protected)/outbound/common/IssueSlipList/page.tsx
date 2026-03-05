"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { issueSlipApi, IssueSlip } from "@/services/issueslip-service";
import { useRouter } from "next/navigation";
import { de } from "date-fns/locale";

const IssueSlipListPage = () => {
  const [issueSlips, setIssueSlips] = useState<IssueSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await issueSlipApi.getIssueSlips();
        setIssueSlips(data);
      } catch (error) {
        // Xử lý lỗi nếu cần
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">Danh sách Phiếu Xuất (IssueSlips)</h1>
        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <table className="w-full bg-white rounded shadow text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Mã Phiếu</th>
                <th className="p-3 text-left">Dự án</th>
                <th className="p-3 text-left">Ngày tạo</th>
                <th className="p-3 text-left">Trạng thái</th>
                <th className="p-3 text-left">Ghi chú</th>
                <th className="p-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {issueSlips.map((slip) => (
                <tr key={slip.issueId} className="border-t hover:bg-gray-50">
                  <td className="p-3">{slip.issueCode}</td>
                  <td className="p-3">{slip.projectId}</td>
                  <td className="p-3">{new Date(slip.issueDate).toLocaleString()}</td>
                  <td className="p-3">{slip.status}</td>
                  <td className="p-3">{slip.description}</td>
                  <td className="p-3 text-center">
                   <button
                        className="text-blue-600 hover:underline"
                        onClick={() => {
                          const role = sessionStorage.getItem("role");
                          if(role === "Accountant"){
                            router.push(`/outbound/accountant/checkInventory/${slip.issueId}`);
                          }else{
                             router.push(`/outbound/common/IssueSlipDetail/${slip.issueId}`);
                          }
                             }}
                        >
                        Xem chi tiết
                        </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default IssueSlipListPage;