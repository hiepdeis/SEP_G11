"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { issueSlipApi } from "@/services/issueslip-service";
import { Sidebar } from "@/components/sidebar";


interface AllocationDetail {
  materialName: string;
  batchCode: string;
  allocatedQuantity: number;
  binCode: string;
}

interface InventoryIssueDetail {
  id: number;
  issueCode: string;
  status: string;
  details: AllocationDetail[];
}

const statusColor = (status: string) => {
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

const InventoryIssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<InventoryIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const allChecked = detail && checkedItems.length === detail.details.length;
  useEffect(() => {
  if (!id) return;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await issueSlipApi.getInventoryIssueDetailById(Number(id));
      console.log("Fetched issue detail:", res);
      setDetail(res);
    } catch (error) {
      setError("Không thể tải chi tiết phiếu xuất kho");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);

  const handleDispatch = async () => {
    setDispatching(true);
    await issueSlipApi.handleDispatch(Number(id))
                      .then(() => {
            setDetail((prev) =>
              prev ? { ...prev, status: "Delivering" } : prev
            );
        // @ts-ignore
        window?.toast?.success?.("Dispatch thành công");
      })
      .catch(() => {
        // @ts-ignore
        window?.toast?.error?.("Dispatch thất bại");
      })
      .finally(() => {
        setDispatching(false);
        setShowModal(false);
      });
  };

  const handleCheck = (index: number) => {
      setCheckedItems((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-yellow-400 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center text-red-500 py-8 font-semibold">{error || "Không tìm thấy phiếu xuất kho"}</div>
    );
  }

    return (

    <div className="min-h-screen bg-gray-50 flex">
    <Sidebar />

    <div className="flex-1 max-w-6xl mx-auto py-10 px-6">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-8">
        Chi tiết phiếu xuất kho
      </h1>

      {/* Card */}
      <div className="rounded-2xl shadow-md bg-white p-8 flex flex-col gap-6">

        {/* Header info */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {detail.issueCode}
            </div>
            <div className="text-gray-500 mt-1">
              ID: {detail.id}
            </div>
          </div>

          <span
            className={`px-4 py-1 rounded-full text-sm font-semibold ${statusColor(
              detail.status
            )}`}
          >
            {detail.status}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 text-left">Tên vật tư</th>
                <th className="px-6 py-4 text-left">Batch</th>
                <th className="px-6 py-4 text-left">Số lượng</th>
                <th className="px-6 py-4 text-left">Bin</th>
                <th className="px-6 py-4 text-left">✓</th>
              </tr>
            </thead>
            <tbody>
              {detail.details.map((item, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {item.materialName}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.batchCode}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {item.allocatedQuantity}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.binCode}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={checkedItems.includes(idx)}
                      onChange={() => handleCheck(idx)}
                      className="w-5 h-5 accent-yellow-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dispatch button */}
        {detail.status === "Processing" && allChecked && (
          <div className="flex justify-end pt-4">
            <button
              className="px-8 py-3 rounded-xl bg-yellow-500 text-white font-bold text-lg hover:bg-green-600 transition disabled:opacity-60"
              onClick={handleDispatch}
              disabled={dispatching}
            >
              {dispatching ? "Đang xử lý..." : "Dispatch"}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>


    
    );
};

export default InventoryIssueDetail;