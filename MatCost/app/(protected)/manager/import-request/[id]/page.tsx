"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { managerReceiptApi } from "@/services/receipt-service";

import ManagerView from "@/components/pages/import-request/manager/page";
import StaffView from "@/components/pages/import-request/staff/page";

export default function RequestWrapperPage() {
  const params = useParams();
  const id = Number(params.id);

  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await managerReceiptApi.getById(id);
        setStatus(res.data.status);
      } catch (error) {
        toast.error("Không thể tải thông tin yêu cầu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Đang tải...</p>
      </div>
    );
  }

  if (status === "Submitted" || status === "Approved" || status === "Rejected") {
    return <ManagerView />;
  }

  return <StaffView role="manager" />;
}
