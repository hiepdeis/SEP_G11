"use client";
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

// ── Mock data khớp DB schema ──────────────────────────────────────────────────

// Materials + InventoryCurrent (joined)
const lowStockMaterials = [
  { materialId: 3,  code: "MT-003", name: "Cáp điện 3x1.5mm²",      unit: "cuộn", quantityOnHand: 8,   minStockLevel: 20, warehouseName: "Kho A" },
  { materialId: 5,  code: "MT-005", name: "Ống nhựa PVC Ø27",       unit: "cây",  quantityOnHand: 12,  minStockLevel: 50, warehouseName: "Kho A" },
  { materialId: 9,  code: "MT-009", name: "Vít inox M6×40",          unit: "hộp",  quantityOnHand: 5,   minStockLevel: 30, warehouseName: "Kho B" },
  { materialId: 11, code: "MT-011", name: "Keo chống thấm Sika",     unit: "thùng",quantityOnHand: 3,   minStockLevel: 10, warehouseName: "Kho A" },
  { materialId: 14, code: "MT-014", name: "Dây thép buộc Ø1mm",      unit: "kg",   quantityOnHand: 18,  minStockLevel: 40, warehouseName: "Kho B" },
  { materialId: 17, code: "MT-017", name: "Bóng đèn LED 18W",        unit: "cái",  quantityOnHand: 6,   minStockLevel: 25, warehouseName: "Kho C" },
];

// Receipts (IssueSlips / Receipts tables)
const recentReceipts = [
  { id: "RC-2026-0041", date: "20/03/2026 08:15", supplier: "Công ty CP Vật tư XD Miền Nam", items: 4, status: "Đã nhập",   statusKey: "done"    },
  { id: "RC-2026-0040", date: "19/03/2026 14:30", supplier: "TNHH Thép Việt Phát",           items: 2, status: "Chờ nhập", statusKey: "pending" },
  { id: "RC-2026-0039", date: "19/03/2026 09:00", supplier: "Đại lý Điện Phương Đông",       items: 6, status: "Đã nhập",   statusKey: "done"    },
  { id: "RC-2026-0038", date: "18/03/2026 16:45", supplier: "Công ty CP Vật tư XD Miền Nam", items: 3, status: "Từ chối",  statusKey: "reject"  },
  { id: "RC-2026-0037", date: "18/03/2026 10:20", supplier: "TNHH Hóa chất Sài Gòn",         items: 1, status: "Đã nhập",   statusKey: "done"    },
];

// IssueSlips table
const recentIssues = [
  { id: "IS-2026-0028", date: "20/03/2026 09:45", project: "Dự án Toà nhà A – Quận 7",   items: 5, status: "Đã xuất",   statusKey: "done"    },
  { id: "IS-2026-0027", date: "19/03/2026 15:00", project: "Dự án Đường HT – Bình Dương", items: 3, status: "Chờ xuất", statusKey: "pending" },
  { id: "IS-2026-0026", date: "19/03/2026 11:30", project: "Dự án Toà nhà A – Quận 7",   items: 8, status: "Đã xuất",   statusKey: "done"    },
  { id: "IS-2026-0025", date: "18/03/2026 13:00", project: "Công trình Cầu vượt T3",      items: 2, status: "Đã xuất",   statusKey: "done"    },
  { id: "IS-2026-0024", date: "17/03/2026 16:10", project: "Dự án Đường HT – Bình Dương", items: 4, status: "Chờ xuất", statusKey: "pending" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  done:    "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  reject:  "bg-red-100   text-red-600",
};

const stockPct = (qty: number, min: number) => Math.round((qty / min) * 100);

const urgencyColor = (pct: number) => {
  if (pct <= 30) return { bar: "bg-red-500",    badge: "bg-red-100 text-red-700",    label: "Nguy cấp" };
  if (pct <= 60) return { bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700",label: "Thấp" };
  return           { bar: "bg-blue-400",        badge: "bg-blue-100 text-blue-700",  label: "Cảnh báo" };
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const totalMaterials  = 87;   // Materials table count
  const lowStockCount   = lowStockMaterials.length;
  const todayReceipts   = recentReceipts.filter((r) => r.date.startsWith("20/03")).length;
  const todayIssues     = recentIssues.filter((i)   => i.date.startsWith("20/03")).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-gray-900">Bảng điều khiển</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tổng quan kho vật tư — {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl text-gray-900">{totalMaterials}</p>
          <p className="text-sm text-gray-500 mt-0.5">Tổng vật tư</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl text-gray-900">{lowStockCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">Tồn kho thấp</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl text-gray-900">{todayReceipts}</p>
          <p className="text-sm text-gray-500 mt-0.5">Phiếu nhập hôm nay</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
            <ArrowUpFromLine className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl text-gray-900">{todayIssues}</p>
          <p className="text-sm text-gray-500 mt-0.5">Phiếu xuất hôm nay</p>
        </div>
      </div>

      {/* ── Cảnh báo sắp hết hàng ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-gray-900">Cảnh báo sắp hết hàng</h3>
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{lowStockCount} vật tư</span>
          </div>
          <button onClick={() => router.push("/materials")} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {lowStockMaterials.map((m) => {
            const pct = stockPct(m.quantityOnHand, m.minStockLevel);
            const { bar, badge, label } = urgencyColor(pct);
            return (
              <div key={m.materialId} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-900 truncate">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.code}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge}`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                      <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {m.quantityOnHand} / {m.minStockLevel} {m.unit}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{m.warehouseName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Phiếu nhập / xuất gần đây ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Phiếu nhập */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
              <h3 className="text-gray-900">Phiếu nhập gần đây</h3>
            </div>
            <button onClick={() => router.push("/workflows")} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentReceipts.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600">{r.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusStyle[r.statusKey]}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{r.supplier}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />{r.date.split(" ")[1]}
                  </p>
                  <p className="text-xs text-gray-400">{r.date.split(" ")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phiếu xuất */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-violet-600" />
              <h3 className="text-gray-900">Phiếu xuất gần đây</h3>
            </div>
            <button onClick={() => router.push("/workflows")} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIssues.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-violet-600">{s.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusStyle[s.statusKey]}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{s.project}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />{s.date.split(" ")[1]}
                  </p>
                  <p className="text-xs text-gray-400">{s.date.split(" ")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}