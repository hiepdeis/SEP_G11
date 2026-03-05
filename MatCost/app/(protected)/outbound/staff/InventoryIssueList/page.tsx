"use client";
import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { issueSlipApi } from "@/services/issueslip-service";
import { useRouter } from "next/navigation";

interface InventoryIssue {
  inventoryIssueId: number;
  issueCode: string;
  createdDate: string;
  status: string;
  issueSlipId: number;
  issueSlipCode: string;
  projectName: string;
}
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    pad(date.getDate()) +
    "/" +
    pad(date.getMonth() + 1) +
    "/" +
    date.getFullYear() +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
};



const getStatusStyle = (status: string) => {
  switch (status) {
    case "Processing":
      return "bg-yellow-100 text-yellow-700";
    case "Delivering":
      return "bg-blue-100 text-blue-700";
    case "Completed":
      return "bg-green-100 text-green-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};



const InventoryIssueList: React.FC = () => {
  const router = useRouter();
  const [issues, setIssues] = useState<InventoryIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await issueSlipApi.getInventoryIssueList();
      console.log("Fetched issues:", res);
      setIssues(res);
    } catch (err) {
      setError("Lỗi khi tải danh sách phiếu xuất kho");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);



   return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 max-w-6xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-bold mb-6">
          Danh sách phiếu xuất kho (Processing)
        </h1>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <span className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></span>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8 font-semibold">
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            Không có phiếu xuất kho nào đang xử lý.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <div
                key={issue.inventoryIssueId}
                className="rounded-2xl shadow-md bg-white p-8 flex flex-col gap-4 min-h-[220px]"
              >
                <div className="text-2xl font-bold text-gray-800">
                  {issue.issueCode}
                </div>

                <div className="text-gray-600">
                  Dự án:{" "}
                  <span className="font-medium">
                    {issue.projectName}
                  </span>
                </div>

                <div className="text-gray-500">
                  Ngày tạo: {formatDate(issue.createdDate)}
                </div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyle(
                      issue.status
                    )}`}
                  >
                    {issue.status}
                  </span>
                </div>

                <div className="flex gap-4 mt-auto pt-4">
                  <button
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition"
                    onClick={() =>
                      router.push(`/outbound/staff/InventoryIssueDetail/${issue.inventoryIssueId}`)
                    }
                  >
                    Xem chi tiết - chuẩn bị - xuất kho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryIssueList;
